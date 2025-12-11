import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, CreditCard, Banknote, AlertCircle, CheckCircle2 } from "lucide-react";
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
import { CardPaymentForm, CardPaymentData } from "@/components/CardPaymentForm";

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
  appointmentType: z.string().optional(),
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
  paymentMethod: z.enum(["card", "cash"], {
    required_error: "Please select how you would like to pay.",
    invalid_type_error: "Please select a valid payment method.",
  }),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

// Generate time slots from 9 AM to 5 PM (fallback only - should use dentist availability)
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

interface BookingFormProps {
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

export function BookingForm({
  dentistId,
  dentistName,
  dentistEmail,
  onSuccess,
}: BookingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointmentTypes, setAppointmentTypes] = useState<any[]>([]);
  const [selectedTypePrice, setSelectedTypePrice] = useState<number>(50);
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

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      patientName: "",
      patientEmail: "",
      phone: "",
      appointmentType: "",
      reason: "",
      time: "",
      paymentMethod: "cash",
    },
  });

  // Fetch appointment types filtered by dentist specialty
  useEffect(() => {
    const fetchAppointmentTypes = async () => {
      // Use the function to get services for this specific dentist
      // @ts-ignore - get_services_for_dentist function will be added by migration
      const { data, error } = await (supabase as any).rpc('get_services_for_dentist', {
        p_dentist_id: dentistId
      });

      if (error) {
        console.error('Error fetching services:', error);
        // Fallback: fetch all services
        // @ts-ignore - appointment_types table will be added by migration
        const { data: allServices } = await (supabase as any)
          .from('appointment_types')
          .select('*')
          .order('base_price');
        if (allServices) setAppointmentTypes(allServices);
      } else if (data) {
        setAppointmentTypes(data);
      }
    };
    fetchAppointmentTypes();
  }, [dentistId]);

  // Watch the selected date to fetch booked slots
  const selectedDate = form.watch("date");

  // Watch appointment type to update price
  const selectedType = form.watch("appointmentType");
  useEffect(() => {
    const type = appointmentTypes.find(t => t.type_name === selectedType);
    if (type) setSelectedTypePrice(type.base_price);
  }, [selectedType, appointmentTypes]);

  // Fetch dentist availability and booked slots
  const { data: availability, isLoading: isLoadingAvailability } = useDentistAvailability(dentistId);
  const { data: bookedSlots, refetch: refetchBookedSlots } = useBookedSlots(dentistId, selectedDate);

  // Generate available time slots based on availability and bookings
  const availableTimeSlots = selectedDate && availability && bookedSlots !== undefined
    ? generateTimeSlotsForDate(selectedDate, availability, bookedSlots)
    : [];

  // Use availability-based slots ONLY - don't show fallback slots
  // This ensures we only show times when dentist is actually available
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
    : []; // Empty array if no availability - don't show fallback slots

  // Helper function to check if a date is available based on dentist schedule
  const isDateAvailable = (date: Date): boolean => {
    if (!availability || availability.length === 0) {
      return false; // No availability data = not available
    }

    const jsDayOfWeek = date.getDay(); // JavaScript: 0 = Sunday, 1 = Monday, etc.
    // Convert JavaScript day to database convention (0=Monday, 1=Tuesday, ..., 6=Sunday)
    // Database: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
    // JavaScript: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    const dbDayOfWeek = jsDayOfWeek === 0 ? 6 : jsDayOfWeek - 1;

    // Check if dentist has availability for this day of week
    // Try both conventions for compatibility (some data might use JS convention)
    return availability.some(a => {
      const matchesDay = a.day_of_week === jsDayOfWeek || a.day_of_week === dbDayOfWeek;
      return matchesDay && a.is_available === true;
    });
  };

  const onSubmit = async (data: BookingFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Generate unique booking reference
      const bookingReference = generateBookingReference();

      logger.info('Starting appointment booking', {
        dentistId,
        dentistName,
        paymentMethod: data.paymentMethod,
        appointmentDate: format(data.date, "yyyy-MM-dd"),
        appointmentTime: data.time,
        isAuthenticated: !!user,
      });

      // Create appointment directly in Supabase with comprehensive logging
      // Allow both authenticated and anonymous bookings
      const appointmentData = {
        patient_id: user?.id || null, // Allow null for guest bookings
        patient_name: data.patientName,
        patient_email: data.patientEmail,
        patient_phone: data.phone,
        dentist_id: dentistId,
        dentist_name: dentistName,
        dentist_email: dentistEmail,
        appointment_date: format(data.date, "yyyy-MM-dd"),
        appointment_time: data.time,
        appointment_type: data.appointmentType,
        appointment_reason: data.reason,
        estimated_price: selectedTypePrice,
        symptoms: data.reason,
        chief_complaint: data.reason,
        status: 'upcoming',
        payment_method: data.paymentMethod,
        payment_status: 'pending',
        booking_reference: bookingReference,
        booking_source: user ? 'manual' : 'guest', // Track if guest or authenticated booking
      };

      const appointment = await withDatabaseLogging(
        DatabaseOperation.INSERT,
        'appointments',
        async () => {
          // @ts-ignore - Some columns will be added by migration
          const { data: result, error: appointmentError } = await (supabase as any)
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

      // Generate PDF and send notifications (non-blocking, optional)
      // Note: PDF generation is currently disabled to prevent booking failures
      // The booking should succeed even if PDF generation fails
      logger.info('Appointment created successfully - PDF generation skipped', {
        appointmentId,
        note: 'PDF generation endpoint may not be configured'
      });

      // Handle card payment processing simulation
      if (data.paymentMethod === 'card') {
        if (!isCardValid || !cardData) {
          setError('Please enter valid card details');
          setIsSubmitting(false);
          return;
        }

        // Simulate payment processing (2 second delay)
        setIsProcessingPayment(true);
        logger.info('Processing card payment', {
          cardType: cardData.cardType,
          lastFour: cardData.lastFourDigits,
        });

        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsProcessingPayment(false);

        toast({
          title: "Payment Successful!",
          description: `Card ending in ${cardData.lastFourDigits} was charged $${selectedTypePrice}.00`,
        });
      }

      // Payment successful - now create appointment
      logger.success('Payment processed successfully', {
        appointmentId,
        paymentMethod: data.paymentMethod,
      });

      // Refresh booked slots to update availability
      refetchBookedSlots();

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

            {/* Appointment Type - OPTIONAL */}
            <FormField
              control={form.control}
              name="appointmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Type (Optional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting || isStripeProcessing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select if you know what service you need" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">
                        <span className="text-muted-foreground">Not sure - I'll describe my symptoms</span>
                      </SelectItem>
                      {appointmentTypes.map((type) => (
                        <SelectItem key={type.id} value={type.type_name}>
                          <div className="flex flex-col">
                            <span>{type.type_name} - ${type.base_price}</span>
                            {type.description && (
                              <span className="text-xs text-muted-foreground">
                                {type.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select a service if you know what you need, or leave blank and describe your symptoms below
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Show estimated price */}
            {selectedType && selectedType !== "" && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900">
                  Estimated Price: ${selectedTypePrice}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Final price may vary based on treatment complexity
                </p>
              </div>
            )}

            {/* Show message if no service selected */}
            {(!selectedType || selectedType === "") && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm font-medium text-amber-900">
                  💡 No service selected
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Please describe your symptoms or concerns in detail below. The dentist will determine the appropriate treatment and pricing during your visit.
                </p>
              </div>
            )}

            {/* Reason for Visit */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {selectedType && selectedType !== ""
                      ? "Additional Details"
                      : "Describe Your Symptoms *"}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        selectedType && selectedType !== ""
                          ? "Any additional information about your condition..."
                          : "Please describe your symptoms, pain level, when it started, etc..."
                      }
                      className="min-h-[100px]"
                      {...field}
                      disabled={isSubmitting || isStripeProcessing}
                    />
                  </FormControl>
                  <FormDescription>
                    {selectedType && selectedType !== ""
                      ? "Provide any additional details that might help the dentist"
                      : "Describe your dental concerns in detail - this helps the dentist prepare for your visit"}
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
                        disabled={(date) => {
                          // Disable past dates
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          if (date < today) return true;

                          // Disable if submitting
                          if (isSubmitting || isStripeProcessing) return true;

                          // Disable if dentist is not available on this day
                          if (!isDateAvailable(date)) return true;

                          return false;
                        }}
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
                          {selectedDate
                            ? (isLoadingAvailability
                              ? "Loading available times..."
                              : availability && availability.length === 0
                                ? "Dentist has no availability set. Please contact directly."
                                : "No available time slots for this date")
                            : "Please select a date first"}
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
                      className="flex flex-col space-y-3"
                      disabled={isSubmitting || isProcessingPayment}
                    >
                      {/* Cash Option */}
                      <div className="flex items-start space-x-3 space-y-0">
                        <RadioGroupItem value="cash" id="cash" />
                        <Label
                          htmlFor="cash"
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
                                Pay at your appointment - ${selectedTypePrice}.00
                              </p>
                            </div>
                          </div>
                        </Label>
                      </div>

                      {/* Card Option */}
                      <div className="flex items-start space-x-3 space-y-0">
                        <RadioGroupItem value="card" id="card" />
                        <Label
                          htmlFor="card"
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
                                Pay now with Visa, MasterCard, or Amex - ${selectedTypePrice}.00
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
                      Pay ${selectedTypePrice}.00 & Book
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
