import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, CreditCard, Banknote, AlertCircle } from "lucide-react";
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
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { appointmentService } from "@/services/appointmentService";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { handleDatabaseError, handleApplicationError, formatErrorForUser, BookingError } from "@/utils/errorHandler";
import { generateBookingReference } from "@/utils/bookingReference";
import { logger, DatabaseOperation, withDatabaseLogging } from "@/utils/logger";
import { useDentistAvailability, useBookedSlots, generateTimeSlotsForDate } from "@/hooks/useDentistAvailability";
import { trackBookingAttempt } from "@/utils/performanceMonitor";

// Validation schema using Zod
const bookingFormSchema = z.object({
  patientName: z.string()
    .min(2, {
      message: "Name must be at least 2 characters long.",
    })
    .max(100, {
      message: "Name must not exceed 100 characters.",
    })
    .regex(/^[a-zA-Z\s'-]+$/, {
      message: "Name can only contain letters, spaces, hyphens, and apostrophes.",
    }),
  patientEmail: z.string()
    .email({
      message: "Please enter a valid email address (e.g., john@example.com).",
    })
    .max(255, {
      message: "Email must not exceed 255 characters.",
    }),
  phone: z.string()
    .min(10, {
      message: "Phone number must be at least 10 digits.",
    })
    .max(20, {
      message: "Phone number must not exceed 20 characters.",
    })
    .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, {
      message: "Please enter a valid phone number (e.g., +1 555-123-4567).",
    }),
  reason: z.string()
    .min(10, {
      message: "Please provide more details about your visit (at least 10 characters).",
    })
    .max(500, {
      message: "Reason must not exceed 500 characters.",
    }),
  date: z.date({
    required_error: "Please select an appointment date.",
    invalid_type_error: "Please select a valid date.",
  }),
  time: z.string({
    required_error: "Please select an appointment time.",
  }).min(1, {
    message: "Please select an appointment time.",
  }),
  paymentMethod: z.enum(["stripe", "cash"], {
    required_error: "Please select how you would like to pay.",
    invalid_type_error: "Please select a valid payment method.",
  }),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

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

interface BookingFormProps {
  dentistId: string;
  dentistName: string;
  dentistEmail: string;
  onSuccess?: (data: {
    appointmentId: string;
    date: string;
    time: string;
    paymentMethod: "stripe" | "cash";
    paymentStatus: "pending" | "paid";
  }) => void;
}

export function BookingForm({
  dentistId,
  dentistName,
  dentistEmail,
  onSuccess,
}: BookingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { initiateCheckout, isProcessing: isStripeProcessing, error: stripeError } = useStripeCheckout();

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      patientName: "",
      patientEmail: "",
      phone: "",
      reason: "",
      time: "",
      paymentMethod: "cash",
    },
  });

  // Watch the selected date to fetch booked slots
  const selectedDate = form.watch("date");

  // Fetch dentist availability and booked slots
  const { data: availability } = useDentistAvailability(dentistId);
  const { data: bookedSlots, refetch: refetchBookedSlots } = useBookedSlots(dentistId, selectedDate);

  // Generate available time slots based on availability and bookings
  const availableTimeSlots = selectedDate && availability && bookedSlots
    ? generateTimeSlotsForDate(selectedDate, availability, bookedSlots)
    : [];

  // Use availability-based slots if available, otherwise fall back to default slots
  const displayTimeSlots = availableTimeSlots.length > 0
    ? availableTimeSlots.map(slot => ({
        value: slot.time,
        label: new Date(`2000-01-01T${slot.time}`).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        disabled: slot.isBooked,
      }))
    : timeSlots.map(slot => ({ ...slot, disabled: false }));

  const onSubmit = async (data: BookingFormValues) => {
    setIsSubmitting(true);
    setError(null);

    // Check if user is authenticated
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
      // Generate unique booking reference
      const bookingReference = generateBookingReference();
      
      logger.info('Starting appointment booking', {
        dentistId,
        dentistName,
        paymentMethod: data.paymentMethod,
        appointmentDate: format(data.date, "yyyy-MM-dd"),
        appointmentTime: data.time,
      });
      
      // Create appointment directly in Supabase with comprehensive logging
      const appointmentData = {
        patient_id: user.id,
        patient_name: data.patientName,
        patient_email: data.patientEmail,
        patient_phone: data.phone,
        dentist_id: dentistId,
        dentist_email: dentistEmail,
        appointment_date: format(data.date, "yyyy-MM-dd"),
        appointment_time: data.time,
        symptoms: data.reason,
        chief_complaint: data.reason,
        status: 'upcoming',
        payment_method: data.paymentMethod,
        payment_status: 'pending',
        booking_reference: bookingReference,
      };
      
      const appointment = await withDatabaseLogging(
        DatabaseOperation.INSERT,
        'appointments',
        async () => {
          const { data: result, error: appointmentError } = await supabase
            .from('appointments')
            .insert(appointmentData)
            .select()
            .single();

          if (appointmentError) {
            // Use enhanced error handler to classify and format the error
            handleDatabaseError(appointmentError);
          }

          if (!result) {
            throw new BookingError(
              "No appointment data returned from database",
              "NO_DATA",
              {},
              "Failed to create appointment. Please try again."
            );
          }

          return result;
        },
        {
          dentistId,
          appointmentDate: appointmentData.appointment_date,
          appointmentTime: appointmentData.appointment_time,
          paymentMethod: appointmentData.payment_method,
          bookingReference,
        }
      );

      const appointmentId = appointment.id;
      
      logger.success('Appointment created successfully', {
        appointmentId,
        bookingReference,
      });

      // Track successful booking attempt
      trackBookingAttempt(true, undefined, {
        dentistId,
        paymentMethod: data.paymentMethod,
        appointmentDate: format(data.date, "yyyy-MM-dd"),
      });

      // Generate PDF and send notifications
      try {
        logger.debug('Generating appointment PDF', { appointmentId });
        
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
          logger.success('PDF generated and notifications sent successfully', { appointmentId });
        } else {
          const errorText = await pdfResponse.text();
          logger.error('Failed to generate PDF', null, {
            appointmentId,
            status: pdfResponse.status,
            response: errorText,
          });
        }
      } catch (pdfError) {
        logger.error('Error generating PDF', pdfError, { appointmentId });
        // Don't fail the booking if PDF generation fails
      }

      // Handle payment method
      if (data.paymentMethod === "stripe") {
        // Initiate Stripe Checkout
        logger.info('Initiating Stripe checkout', { appointmentId });
        
        toast({
          title: "Redirecting to payment...",
          description: "Please complete your payment to confirm the appointment.",
        });

        try {
          await initiateCheckout({
            appointmentId,
            amount: 5000, // $50.00 in cents - this should be configurable
            currency: "usd",
            dentistName,
            patientEmail: data.patientEmail,
            appointmentDate: format(data.date, "yyyy-MM-dd"),
            appointmentTime: data.time,
          });
          
          logger.success('Stripe checkout initiated', { appointmentId });
        } catch (stripeErr) {
          // Handle Stripe-specific errors
          logger.error('Stripe checkout failed', stripeErr, { appointmentId });
          
          const stripeError = handleApplicationError(stripeErr, 'Stripe checkout initialization');
          const stripeErrorMessage = formatErrorForUser(stripeError);
          
          setError(stripeErrorMessage);
          
          toast({
            title: "Payment Error",
            description: stripeErrorMessage,
            variant: "destructive",
          });
          
          setIsSubmitting(false);
          return;
        }
      } else {
        // Cash payment - show success immediately
        logger.success('Cash payment appointment confirmed', { appointmentId });
        
        // Refresh booked slots to update availability
        refetchBookedSlots();
        
        toast({
          title: "Appointment booked successfully!",
          description: "Your appointment has been confirmed. Please bring payment to your appointment.",
        });

        if (onSuccess) {
          onSuccess({
            appointmentId,
            date: format(data.date, "yyyy-MM-dd"),
            time: data.time,
            paymentMethod: data.paymentMethod,
            paymentStatus: "pending",
          });
        }

        // Reset form after successful submission
        form.reset();
      }
    } catch (err: any) {
      // Enhanced error handling with detailed classification
      let bookingError: BookingError;
      let errorMessage: string;
      
      // Check if this is a slot unavailable error with alternative slots (from backend API)
      if (err?.response?.status === 409 && err?.response?.data?.error?.details?.alternativeSlots) {
        const alternatives = err.response.data.error.details.alternativeSlots;
        const alternativeTimesText = alternatives
          .slice(0, 3)
          .map((slot: { time: string }) => {
            const displayTime = new Date(`2000-01-01T${slot.time}`).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });
            return displayTime;
          })
          .join(", ");
        
        errorMessage = `This time slot was just booked by another patient. Available times: ${alternativeTimesText}${alternatives.length > 3 ? " and more" : ""}. Please select a different time.`;
        bookingError = new BookingError(
          'Slot conflict with alternative suggestions',
          'SLOT_CONFLICT',
          { alternativeSlots: alternatives },
          errorMessage
        );
        
        logger.warn('Booking slot conflict', {
          dentistId,
          requestedDate: format(data.date, "yyyy-MM-dd"),
          requestedTime: data.time,
          alternativeSlots: alternatives.length,
        });
      } else if (err instanceof BookingError) {
        // Already a BookingError from handleDatabaseError
        bookingError = err;
        errorMessage = formatErrorForUser(err);
      } else {
        // Handle as general application error
        bookingError = handleApplicationError(err, 'Booking form submission');
        errorMessage = formatErrorForUser(bookingError);
      }
      
      // Log the structured error using the comprehensive logger
      logger.error('Booking submission failed', bookingError, {
        code: bookingError.code,
        userMessage: bookingError.userMessage,
        dentistId,
        paymentMethod: data.paymentMethod,
      });

      // Track failed booking attempt
      trackBookingAttempt(false, bookingError.message, {
        dentistId,
        paymentMethod: data.paymentMethod,
        errorCode: bookingError.code,
      });
      
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Book Appointment with {dentistName}</CardTitle>
        <CardDescription>
          Fill out the form below to schedule your dental appointment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Patient Name */}
            <FormField
              control={form.control}
              name="patientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} disabled={isSubmitting || isStripeProcessing} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Patient Email */}
            <FormField
              control={form.control}
              name="patientEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john.doe@example.com"
                      {...field}
                      disabled={isSubmitting || isStripeProcessing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone Number */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      {...field}
                      disabled={isSubmitting || isStripeProcessing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason for Visit */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Visit</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please describe your symptoms or reason for the appointment..."
                      className="min-h-[100px]"
                      {...field}
                      disabled={isSubmitting || isStripeProcessing}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide details about your dental concerns
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Picker */}
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
                          disabled={isSubmitting || isStripeProcessing}
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
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0)) || isSubmitting || isStripeProcessing
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Select your preferred appointment date
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time Picker */}
            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Appointment Time</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting || isStripeProcessing || !selectedDate}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedDate ? "Select a time slot" : "Select a date first"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {displayTimeSlots.length > 0 ? (
                        displayTimeSlots.map((slot) => (
                          <SelectItem 
                            key={slot.value} 
                            value={slot.value}
                            disabled={slot.disabled}
                          >
                            {slot.label} {slot.disabled ? "(Booked)" : ""}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-slots" disabled>
                          {selectedDate ? "No available slots for this date" : "Select a date first"}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {availableTimeSlots.length > 0 
                      ? "Available time slots based on dentist's schedule" 
                      : "Choose your preferred appointment time"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      className="flex flex-col space-y-2"
                      disabled={isSubmitting || isStripeProcessing}
                    >
                      <div className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 hover:bg-accent cursor-pointer">
                        <RadioGroupItem value="cash" id="cash" className="mt-1" disabled={isSubmitting || isStripeProcessing} />
                        <div className="flex-1">
                          <Label
                            htmlFor="cash"
                            className="font-medium cursor-pointer flex items-center gap-2"
                          >
                            <Banknote className="h-4 w-4" />
                            Cash Payment
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Pay at your appointment
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 hover:bg-accent cursor-pointer">
                        <RadioGroupItem value="stripe" id="stripe" className="mt-1" disabled={isSubmitting || isStripeProcessing} />
                        <div className="flex-1">
                          <Label
                            htmlFor="stripe"
                            className="font-medium cursor-pointer flex items-center gap-2"
                          >
                            <CreditCard className="h-4 w-4" />
                            Credit/Debit Card
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Secure online payment with Stripe
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    Choose how you would like to pay for your appointment ($50.00)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
              disabled={isSubmitting || isStripeProcessing}
            >
              {isSubmitting || isStripeProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isStripeProcessing ? "Redirecting to payment..." : "Booking Appointment..."}
                </>
              ) : (
                <>
                  {form.watch("paymentMethod") === "stripe" ? (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Continue to Payment
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
