import { supabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';

interface HandleMessageRequest {
  userId: string;
  conversationId?: string;
  message: string;
}

interface ChatbotResponse {
  conversationId: string;
  message: string;
  state: string;
  options?: string[];
  suggestedDentist?: any;
}

interface GetAvailableSlotsRequest {
  dentistId?: string;
  specialization?: string;
  date?: string;
}

/**
 * Chatbot Service (Backend)
 * Handles conversation logging, state management, and integration with frontend chatbot
 */
class ChatbotService {
  /**
   * Handle chatbot message from frontend
   * Logs conversation to database and returns response
   */
  async handleMessage(request: HandleMessageRequest): Promise<ChatbotResponse> {
    const { userId, conversationId, message } = request;

    try {
      // Get or create conversation
      let conversation;
      if (conversationId) {
        const { data } = await supabase
          .from('chatbot_conversations')
          .select('*')
          .eq('id', conversationId)
          .single();
        conversation = data;
      }

      if (!conversation) {
        // Create new conversation
        const { data: newConv } = await supabase
          .from('chatbot_conversations')
          .insert({
            patient_id: userId,
            messages: [],
            status: 'active',
          })
          .select()
          .single();
        conversation = newConv;
      }

      // Log message to conversation
      const messages = conversation?.messages || [];
      messages.push({
        role: 'patient',
        content: message,
        timestamp: new Date().toISOString(),
      });

      await supabase
        .from('chatbot_conversations')
        .update({ messages, updated_at: new Date().toISOString() })
        .eq('id', conversation.id);

      logger.info('Chatbot message logged', {
        conversationId: conversation.id,
        userId,
      });

      // Return response (actual conversation logic is handled in frontend)
      return {
        conversationId: conversation.id,
        message: 'Message received',
        state: 'processing',
      };
    } catch (error) {
      logger.error('Error handling chatbot message', { error, userId });
      throw error;
    }
  }

  /**
   * Get conversation history
   */
  async getConversation(conversationId: string, userId: string) {
    try {
      const { data, error } = await supabase
        .from('chatbot_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('patient_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error fetching conversation', { error, conversationId, userId });
      throw error;
    }
  }

  /**
   * Generate PDF summary for appointment
   */
  async generateAppointmentPDF(appointmentId: string, userId: string): Promise<string> {
    try {
      // Fetch appointment details
      const { data: appointment, error } = await supabase
        .from('appointments')
        .select('*, dentists(*)')
        .eq('id', appointmentId)
        .eq('patient_id', userId)
        .single();

      if (error) throw error;

      // PDF generation logic would go here
      // For now, return placeholder URL
      const pdfUrl = `https://placeholder.com/pdf/${appointmentId}.pdf`;

      // Update appointment with PDF URL
      await supabase
        .from('appointments')
        .update({ pdf_report_url: pdfUrl })
        .eq('id', appointmentId);

      logger.info('PDF generated', { appointmentId, pdfUrl });

      return pdfUrl;
    } catch (error) {
      logger.error('Error generating PDF', { error, appointmentId });
      throw error;
    }
  }

  /**
   * Get available appointment slots
   */
  async getAvailableSlots(request: GetAvailableSlotsRequest): Promise<any[]> {
    try {
      let query = supabase
        .from('dentists')
        .select('id, name, specialization, available_times, rating');

      if (request.dentistId) {
        query = query.eq('id', request.dentistId);
      }

      if (request.specialization) {
        query = query.eq('specialization', request.specialization);
      }

      const { data: dentists, error } = await query;

      if (error) throw error;

      // Format slots (simplified version)
      const slots = dentists?.map((dentist: any) => ({
        dentist_id: dentist.id,
        dentist_name: dentist.name,
        specialization: dentist.specialization,
        rating: dentist.rating,
        available_times: dentist.available_times,
      })) || [];

      return slots;
    } catch (error) {
      logger.error('Error fetching available slots', { error, request });
      throw error;
    }
  }
}

// Export singleton instance
export const chatbotService = new ChatbotService();
