import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, CreditCard, Banknote, AlertCircle, Upload, X, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { CardPaymentForm, CardPaymentData } from "@/components/CardPaymentForm";

// Enhanced validation schema with medical history
const enhancedBookingFormSchema = z.object({
  // Basic Information
  patientName: z.string()
    .min(2, { message: "Name must be at least 2 characters long." })
    .max(100, { message: "Name must not exceed 100 characters." })
    .regex(/^[a-zA-Z\s'-]+$/, { message: "Name can only contain letters, spaces, hyphens, and apostrophes." }),
  patientEmail: z.string()
    .email({ message: "Please enter a valid email address." })
    .max(255, { message: "Email must not exceed 255 characters." }),
  phone: z.string()
    .min(10, { message: "Phone number must be at least 10 digits." })
    .max(20, { message: "Phone number must not exceed 20 characters." })
    .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, { message: "Please enter a valid phone number." }),

  // Gender and Pregnancy
  gender: z.enum(["male", "female"], {
    required_error: "Please select your gender.",
  }),
  isPregnant: z.boolean().default(false).optional(),

  // Appointment Details
  date: z.date({
    required_error: "Please select an appointment date.",
    invalid_type_error: "Please select a valid date.",
  }),
  time: z.string({
    required_error: "Please select an appointment time.",
  }).min(1, { message: "Please select an appointment time." }),

  // Medical Information
  chiefComplaint: z.string()
    .min(10, { message: "Please provide more details about your visit (at least 10 characters)." })
    .max(500, { message: "Chief complaint must not exceed 500 characters." }),
  symptoms: z.string()
    .min(10, { message: "Please describe your symptoms (at least 10 characters)." })
    .max(1000, { message: "Symptoms must not exceed 1000 characters." }),

  // Chronic Diseases (Important)
  chronicDiseases: z.string().optional(),

  // Medical History
  smoking: z.boolean().default(false),
  medications: z.string().optional(),
  allergies: z.string().optional(),
  previousDentalWork: z.string().optional(),
  medicalHistory: z.string().optional(),

  // Payment
  paymentMethod: z.enum(["card", "cash"], {
    required_error: "Please select how you would like to pay.",
    invalid_type_error: "Please select a valid payment method.",
  }),
});

type EnhancedBookingFormValues = z.infer<typeof enhancedBookingFormSchema>;

// Generate time slots from 9 AM to 5 PM
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 9; hour <= 17; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      const displayTime = new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      slots.push({ value: time, label: displayTime });
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

interface EnhancedBookingFormProps {
  dentistId: string;
  dentistName: string;
  dentistEmail: string;
  onSuccess?: (data: {
    appointmentId: string;
    date: string;
    time: string;
    paymentMethod: "card" | "cash";
    paymentStatus: "pending" | "paid";
  }) => void;
}

export function EnhancedBookingForm({
  dentistId,
  dentistName,
  dentistEmail,
  onSuccess,
}: EnhancedBookingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<{ value: string; label: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isMedicalHistoryOpen, setIsMedicalHistoryOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [cardData, setCardData] = useState<CardPaymentData | null>(null);
  const [isCardValid, setIsCardValid] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { initiateCheckout, isProcessing: isStripeProcessing, error: stripeError } = useStripeCheckout();

  // Handle card data changes from CardPaymentForm
  const handleCardDataChange = (data: CardPaymentData, isValid: boolean) => {
    setCardData(data);
    setIsCardValid(isValid);
  };

  const form = useForm<EnhancedBookingFormValues>({
    resolver: zodResolver(enhancedBookingFormSchema),
    defaultValues: {
      patientName: "",
      patientEmail: "",
      phone: "",
      gender: undefined,
      isPregnant: false,
      chiefComplaint: "",
      symptoms: "",
      chronicDiseases: "",
      smoking: false,
      medications: "",
      allergies: "",
      previousDentalWork: "",
      medicalHistory: "",
      time: "",
      paymentMethod: "cash",
    },
  });

  // Fetch dentist's availability when date is selected
  useEffect(() => {
    if (!selectedDate) {
      setAvailableTimeSlots([]);
      return;
    }

    const fetchAvailability = async () => {
      try {
        const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

        const { data, error } = await supabase
          .from('dentist_availability')
          .select('*')
          .eq('dentist_id', dentistId)
          .eq('day_of_week', dayOfWeek)
          .eq('is_available', true);

        if (error) throw error;

        if (!data || data.length === 0) {
          // No availability set for this day
          setAvailableTimeSlots([]);
          toast({
            title: "No Availability",
            description: `${dentistName} is not available on this day. Please select another date.`,
            variant: "destructive",
          });
          return;
        }

        // Generate time slots based on dentist's availability
        const slots: { value: string; label: string }[] = [];
        const now = new Date();
        const isToday = selectedDate.toDateString() === now.toDateString();

        data.forEach((availability: any) => {
          const startTime = availability.start_time; // e.g., "12:00:00"
          const endTime = availability.end_time; // e.g., "16:00:00"
          const slotDuration = availability.slot_duration_minutes || 30;

          // Parse start and end times
          const [startHour, startMin] = startTime.split(':').map(Number);
          const [endHour, endMin] = endTime.split(':').map(Number);

          let currentHour = startHour;
          let currentMin = startMin;

          while (
            currentHour < endHour ||
            (currentHour === endHour && currentMin < endMin)
          ) {
            const timeValue = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;

            // Check if time has passed for today
            let isPastTime = false;
            if (isToday) {
              const slotTime = new Date(selectedDate);
              slotTime.setHours(currentHour, currentMin, 0, 0);
              if (slotTime <= now) {
                isPastTime = true;
              }
            }

            if (!isPastTime) {
              const displayTime = new Date(`2000-01-01T${timeValue}`).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              });

              slots.push({ value: timeValue, label: displayTime });
            }

            // Increment by slot duration
            currentMin += slotDuration;
            if (currentMin >= 60) {
              currentHour += Math.floor(currentMin / 60);
              currentMin = currentMin % 60;
            }
          }
        });

        // Fetch existing appointments for this date to filter out booked slots
        // @ts-ignore - Supabase types are outdated, appointment_time column exists
        const { data: existingAppointments, error: apptError } = await supabase
          .from('appointments')
          .select('appointment_time')
          .eq('dentist_email', dentistEmail)
          .eq('appointment_date', selectedDate.toISOString().split('T')[0])
          .in('status', ['pending', 'confirmed']);

        if (apptError) {
          console.error('Error fetching existing appointments:', apptError);
        }

        // Create a set of booked times for fast lookup
        const bookedTimes = new Set(
          existingAppointments?.map(apt => apt.appointment_time) || []
        );

        // Filter out booked slots
        const availableSlots = slots.filter(slot => !bookedTimes.has(slot.value));

        if (availableSlots.length === 0) {
          toast({
            title: "No Availability",
            description: `All time slots for ${dentistName} on this day are fully booked. Please select another date.`,
            variant: "destructive",
          });
        }

        setAvailableTimeSlots(availableSlots);
      } catch (err) {
        console.error('Error fetching availability:', err);
        toast({
          title: "Error",
          description: "Failed to load available time slots. Please try again.",
          variant: "destructive",
        });
      }
    };

    fetchAvailability();
  }, [selectedDate, dentistId, dentistName, toast]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf';
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid Files",
        description: "Some files were rejected. Only images and PDFs under 10MB are allowed.",
        variant: "destructive"
      });
    }

    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (appointmentId: string) => {
    if (uploadedFiles.length === 0) return [];

    const uploadedDocs: { name: string; url: string; type?: string; size?: number }[] = [];

    for (const file of uploadedFiles) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${appointmentId}/${crypto.randomUUID()}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('medical-documents')
          .upload(fileName, file);

        if (error) {
          console.error('Error uploading file:', error);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('medical-documents')
          .getPublicUrl(fileName);

        uploadedDocs.push({
          name: file.name,
          url: urlData.publicUrl,
          type: file.type,
          size: file.size
        });

        // Insert into medical_documents table so dentist portal can see documents
        // Using correct column names from actual database schema
        const isXray = file.type.startsWith('image/');
        // @ts-ignore - medical_documents table exists but types are outdated
        const { error: insertError } = await supabase
          .from('medical_documents')
          .insert({
            patient_id: user?.id,
            appointment_id: appointmentId,
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_type: file.type,
            file_size_bytes: file.size,
            is_xray: isXray,
            xray_format: isXray ? (file.name.toLowerCase().endsWith('.dcm') ? 'DCM' : 'PNG') : null,
            analysis_status: 'pending'
          });

        if (insertError) {
          console.error('Error inserting into medical_documents:', insertError);
          // Don't fail the upload, just log the error - file is still in storage
        } else {
          console.log('Document inserted into medical_documents table successfully');
        }
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }

    return uploadedDocs;
  };

  const onSubmit = async (data: EnhancedBookingFormValues) => {
    setIsSubmitting(true);
    setError(null);

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to book an appointment.",
        variant: "destructive",
      });
      navigate("/auth");
      setIsSubmitting(false);
      return;
    }

    try {
      // Create appointment with enhanced medical data
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          patient_id: user.id,
          patient_name: data.patientName,
          patient_email: data.patientEmail,
          patient_phone: data.phone,
          // @ts-ignore - Types are outdated, columns exist in DB
          gender: data.gender,
          is_pregnant: data.isPregnant || false,
          dentist_id: dentistId,
          dentist_name: dentistName,
          dentist_email: dentistEmail,
          appointment_date: format(data.date, "yyyy-MM-dd"),
          appointment_time: data.time,
          chief_complaint: data.chiefComplaint,
          symptoms: data.symptoms,
          chronic_diseases: data.chronicDiseases,
          medical_history: data.medicalHistory,
          smoking: data.smoking,
          medications: data.medications,
          allergies: data.allergies,
          previous_dental_work: data.previousDentalWork,
          cause_identified: true, // Manual booking assumes cause is identified
          status: 'upcoming',
          payment_method: data.paymentMethod === 'card' ? 'stripe' : data.paymentMethod,
          payment_status: 'pending',
          booking_source: 'manual', // Mark as manual booking for sync tracking
        })
        .select()
        .single();

      if (appointmentError) {
        console.error('Appointment creation error:', appointmentError);
        throw new Error(appointmentError.message || "Failed to create appointment. Please try again.");
      }

      if (!appointment) {
        throw new Error("Failed to create appointment. Please try again.");
      }

      const appointmentId = appointment.id;

      // Save medical information to dedicated table for reliable PDF generation
      try {
        // Upload files first if any
        const uploadedDocs = uploadedFiles.length > 0 ? await uploadFiles(appointmentId) : [];

        const { error: medicalError } = await supabase
          .from('appointment_medical_info')
          .insert({
            appointment_id: appointmentId,
            patient_id: user.id,
            gender: data.gender,
            is_pregnant: data.isPregnant || false,
            chronic_diseases: data.chronicDiseases,
            medical_history: data.medicalHistory,
            medications: data.medications,
            allergies: data.allergies,
            previous_dental_work: data.previousDentalWork,
            smoking: data.smoking,
            symptoms: data.symptoms,
            chief_complaint: data.chiefComplaint,
            documents: uploadedDocs || []
          });

        if (medicalError) {
          console.error('Error saving medical info:', medicalError);
        }
      } catch (medicalSaveError) {
        console.error('Medical info save error:', medicalSaveError);
      }

      // Upload files if any and update appointment with document metadata
      if (uploadedFiles.length > 0) {
        const uploadedDocs = await uploadFiles(appointmentId);

        if (uploadedDocs.length > 0) {
          // @ts-ignore - documents column exists in DB
          const { error: updateError } = await supabase
            .from('appointments')
            .update({ documents: uploadedDocs })
            .eq('id', appointmentId);

          if (updateError) {
            console.error('Error updating appointment with documents:', updateError);
            // Don't fail the whole booking, just log error
            toast({
              title: "Warning",
              description: "Appointment booked but failed to link documents.",
              variant: "destructive"
            });
          }
        }
      }

      // Generate PDF and send notifications
      try {
        const pdfResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-appointment-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({
            appointmentId: appointmentId
          })
        });

        if (pdfResponse.ok) {
          console.log('PDF generated and notifications sent successfully');
        } else {
          console.error('Failed to generate PDF:', await pdfResponse.text());
        }
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError);
        // Don't fail the booking if PDF generation fails
      }

      // Handle card payment processing simulation
      if (data.paymentMethod === 'card') {
        if (!isCardValid || !cardData) {
          setError('Please enter valid card details');
          setIsSubmitting(false);
          return;
        }

        // Simulate payment processing (2 second delay)
        setIsProcessingPayment(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsProcessingPayment(false);

        toast({
          title: "Payment Successful!",
          description: `Card ending in ${cardData.lastFourDigits} was charged $50.00`,
        });
      }

      toast({
        title: "Appointment booked successfully!",
        description: data.paymentMethod === 'card'
          ? "Your appointment has been confirmed. Payment received."
          : "Your appointment has been confirmed. Please bring payment to your appointment.",
      });

      if (onSuccess) {
        onSuccess({
          appointmentId,
          date: format(data.date, "yyyy-MM-dd"),
          time: data.time,
          paymentMethod: data.paymentMethod,
          paymentStatus: data.paymentMethod === 'card' ? "paid" : "pending",
        });
      }

      // Reset form after successful submission
      form.reset();
      setUploadedFiles([]);
    } catch (err: any) {
      let errorMessage = "Failed to book appointment. Please try again.";

      if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);

      toast({
        title: "Booking Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Book Appointment with {dentistName}</CardTitle>
        <CardDescription>
          Fill out the form below to schedule your dental appointment. All medical information is kept confidential.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="patientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="patientEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Pregnancy field - only show if female */}
            {form.watch("gender") === "female" && (
              <FormField
                control={form.control}
                name="isPregnant"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Are you currently pregnant?</FormLabel>
                      <FormDescription>
                        This information is important for your dental treatment
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {/* Medical Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Medical Information</h3>

              <FormField
                control={form.control}
                name="chiefComplaint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chief Complaint</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What is the main reason for your visit?"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Describe the primary reason for your dental appointment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="symptoms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Symptoms</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe any symptoms you're experiencing..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide detailed information about your symptoms
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="chronicDiseases"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-red-600 font-semibold">
                      Chronic Diseases / Conditions (Important) *
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="E.g., Diabetes, High blood pressure, Heart disease, etc."
                        className="min-h-[80px] border-red-200"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Please list any chronic conditions (diabetes, blood pressure, heart disease, etc.).
                      This information is crucial for your dental treatment. Type "None" if you don't have any.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Medical History - Collapsible */}
            <Collapsible open={isMedicalHistoryOpen} onOpenChange={setIsMedicalHistoryOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>Medical History (Optional)</span>
                  {isMedicalHistoryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="smoking"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Do you smoke?</FormLabel>
                        <FormDescription>
                          This information helps us provide better care
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="medications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Medications</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="List any medications you're currently taking..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Include dosage and frequency if known
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allergies</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="List any allergies (medications, materials, etc.)..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Include any known allergies to medications or dental materials
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="previousDentalWork"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Previous Dental Work</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe any previous dental work, surgeries, or treatments..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Include dates and types of procedures if known
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="medicalHistory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>General Medical History</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any relevant medical conditions or history..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Include any medical conditions that might affect dental treatment
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Document Upload */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Medical Documents (Optional)</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Upload medical documents
                      </span>
                      <span className="mt-1 block text-sm text-gray-500">
                        X-rays, reports, or other relevant documents (PDF, JPG, PNG)
                      </span>
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Uploaded Files:</h4>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Appointment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Appointment Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setSelectedDate(date);
                          }}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appointment Time</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a time slot" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableTimeSlots.length > 0 ? (
                          availableTimeSlots.map((slot) => (
                            <SelectItem key={slot.value} value={slot.value}>
                              {slot.label}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-slots-available" disabled>
                            {selectedDate ? 'No available times' : 'Select a date first'}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Payment Method */}
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Payment Method</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-3"
                      disabled={isSubmitting || isProcessingPayment}
                    >
                      {/* Cash Option */}
                      <div className="flex items-start space-x-3 space-y-0">
                        <RadioGroupItem value="cash" id="enhanced-cash" />
                        <Label
                          htmlFor="enhanced-cash"
                          className={cn(
                            "flex-1 rounded-lg border p-4 cursor-pointer transition-colors",
                            field.value === "cash" ? "border-primary bg-primary/5" : "border-input hover:bg-accent/50"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <Banknote className="h-5 w-5 text-primary mt-0.5" />
                            <div className="flex-1">
                              <p className="font-medium flex items-center gap-2">
                                Cash Payment
                                {field.value === "cash" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Pay at your appointment - $50.00
                              </p>
                            </div>
                          </div>
                        </Label>
                      </div>

                      {/* Card Option */}
                      <div className="flex items-start space-x-3 space-y-0">
                        <RadioGroupItem value="card" id="enhanced-card" />
                        <Label
                          htmlFor="enhanced-card"
                          className={cn(
                            "flex-1 rounded-lg border p-4 cursor-pointer transition-colors",
                            field.value === "card" ? "border-primary bg-primary/5" : "border-input hover:bg-accent/50"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <CreditCard className="h-5 w-5 text-primary mt-0.5" />
                            <div className="flex-1">
                              <p className="font-medium flex items-center gap-2">
                                Card Payment
                                {field.value === "card" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Pay now with Visa, MasterCard, or Amex - $50.00
                              </p>
                            </div>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Card Payment Form - Show when card is selected */}
            {form.watch("paymentMethod") === "card" && (
              <CardPaymentForm
                onCardDataChange={handleCardDataChange}
                disabled={isSubmitting}
                isProcessing={isProcessingPayment}
              />
            )}

            {/* Error Message */}
            {(error || stripeError) && (
              <div className="rounded-md bg-destructive/15 p-4 border border-destructive/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive mb-1">Booking Error</p>
                    <p className="text-sm text-destructive/90">{error || stripeError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || isProcessingPayment || (form.watch("paymentMethod") === "card" && !isCardValid)}
            >
              {isSubmitting || isProcessingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isProcessingPayment ? "Processing Payment..." : "Booking Appointment..."}
                </>
              ) : (
                <>
                  {form.watch("paymentMethod") === "card" ? (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay $50.00 & Book
                    </>
                  ) : (
                    "Book Appointment"
                  )}
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
