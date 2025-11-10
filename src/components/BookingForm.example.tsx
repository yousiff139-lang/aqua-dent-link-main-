/**
 * BookingForm Component Usage Example
 * 
 * This file demonstrates how to integrate the BookingForm component
 * into your application. The BookingForm is designed to be used on
 * dentist profile pages or any page where patients can book appointments.
 */

import { useState } from "react";
import { BookingForm } from "./BookingForm";
import { toast } from "sonner";

/**
 * Example 1: Basic Usage
 * 
 * The simplest way to use the BookingForm component.
 * Just pass the required dentist information as props.
 */
export function BasicBookingFormExample() {
  return (
    <div className="container mx-auto py-8">
      <BookingForm
        dentistId="1"
        dentistName="Dr. Sarah Johnson"
        dentistEmail="dr.sarah.johnson@dental.com"
      />
    </div>
  );
}

/**
 * Example 2: With Success Callback
 * 
 * Handle successful booking submissions with a custom callback.
 * This is useful for showing confirmation messages, redirecting users,
 * or updating application state.
 */
export function BookingFormWithCallbackExample() {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string>("");

  const handleBookingSuccess = (data: { 
    appointmentId: string; 
    date: string; 
    time: string; 
    paymentMethod: "stripe" | "cash"; 
    paymentStatus: "pending" | "paid"; 
  }) => {
    setAppointmentId(data.appointmentId);
    setShowConfirmation(true);
    
    // Show a success toast notification
    toast.success("Appointment booked successfully!", {
      description: `Your appointment ID is ${data.appointmentId}`,
    });
  };

  if (showConfirmation) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Booking Confirmed!</h2>
        <p className="text-muted-foreground mb-4">
          Your appointment has been successfully booked.
        </p>
        <p className="text-sm">Appointment ID: {appointmentId}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <BookingForm
        dentistId="1"
        dentistName="Dr. Sarah Johnson"
        dentistEmail="dr.sarah.johnson@dental.com"
        onSuccess={handleBookingSuccess}
      />
    </div>
  );
}

/**
 * Example 3: Integration with Dentist Profile Page
 * 
 * This example shows how to integrate the BookingForm into a dentist
 * profile page with smooth scrolling to the booking section.
 */
export function DentistProfileWithBookingExample() {
  const [showBookingForm, setShowBookingForm] = useState(false);

  const scrollToBooking = () => {
    setShowBookingForm(true);
    setTimeout(() => {
      const bookingSection = document.getElementById("booking-section");
      bookingSection?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <div className="container mx-auto py-8">
      {/* Dentist Profile Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Dr. Sarah Johnson</h1>
        <p className="text-muted-foreground mb-4">
          Board-certified general dentist with 12 years of experience
        </p>
        <button
          onClick={scrollToBooking}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md"
        >
          Book Appointment
        </button>
      </div>

      {/* Booking Form Section */}
      {showBookingForm && (
        <div id="booking-section" className="mt-12">
          <BookingForm
            dentistId="1"
            dentistName="Dr. Sarah Johnson"
            dentistEmail="dr.sarah.johnson@dental.com"
            onSuccess={(data) => {
              console.log("Appointment booked:", data.appointmentId);
              // Handle success (e.g., show confirmation, redirect)
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Example 4: Dynamic Dentist Data
 * 
 * Use the BookingForm with dynamic dentist data from an API or database.
 */
interface Dentist {
  id: string;
  name: string;
  email: string;
  speciality: string;
}

export function DynamicBookingFormExample({ dentist }: { dentist: Dentist }) {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Book with {dentist.name}</h2>
        <p className="text-muted-foreground">{dentist.speciality}</p>
      </div>
      
      <BookingForm
        dentistId={dentist.id}
        dentistName={dentist.name}
        dentistEmail={dentist.email}
        onSuccess={(data) => {
          // Handle successful booking
          console.log("Booked appointment:", data.appointmentId);
          console.log("Date:", data.date, "Time:", data.time);
          console.log("Payment:", data.paymentMethod, data.paymentStatus);
        }}
      />
    </div>
  );
}

/**
 * Props Interface
 * 
 * The BookingForm component accepts the following props:
 * 
 * @param dentistId - Unique identifier for the dentist
 * @param dentistName - Full name of the dentist (e.g., "Dr. Sarah Johnson")
 * @param dentistEmail - Email address of the dentist
 * @param onSuccess - Optional callback function called when booking succeeds
 *                    Receives an object with appointmentId, date, time, paymentMethod, and paymentStatus
 */

/**
 * Form Fields
 * 
 * The BookingForm includes the following fields:
 * 
 * 1. Patient Name (required) - Full name of the patient
 * 2. Email (required) - Valid email address
 * 3. Phone Number (required) - Contact phone number
 * 4. Reason for Visit (required) - Description of dental concerns
 * 5. Appointment Date (required) - Date picker with past dates disabled
 * 6. Appointment Time (required) - Time slot selection (9 AM - 5 PM)
 * 7. Payment Method (required) - Radio buttons for Cash or Stripe
 */

/**
 * Validation Rules
 * 
 * The form validates the following:
 * 
 * - Patient name: Minimum 2 characters
 * - Email: Valid email format
 * - Phone: Minimum 10 characters, valid phone number format
 * - Reason: Minimum 10 characters
 * - Date: Cannot be in the past
 * - Time: Must be selected from available slots
 * - Payment Method: Must select either Cash or Stripe
 */

/**
 * Features
 * 
 * - Form validation using React Hook Form and Zod
 * - Date picker with past date restrictions
 * - Time slot dropdown (9 AM - 5 PM, 30-minute intervals)
 * - Payment method selection (Cash/Stripe)
 * - Loading state during submission
 * - Error message display
 * - Auto-filled dentist information
 * - Responsive design
 * - Accessible form controls
 */
