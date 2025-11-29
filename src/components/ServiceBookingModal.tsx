import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, CreditCard, Banknote, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
import { Label } from "@/components/ui/label";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const serviceBookingSchema = z.object({
  patientName: z.string()
    .min(2, { message: "Name must be at least 2 characters long." })
    .max(100, { message: "Name must not exceed 100 characters." }),
  patientEmail: z.string()
    .email({ message: "Please enter a valid email address." })
    .max(255, { message: "Email must not exceed 255 characters." }),
  phone: z.string()
    .min(10, { message: "Phone number must be at least 10 digits." })
    .max(20, { message: "Phone number must not exceed 20 characters." }),
  date: z.date({
    required_error: "Please select an appointment date.",
  }),
  time: z.string({
    required_error: "Please select an appointment time.",
  }).min(1, { message: "Please select an appointment time." }),
  paymentMethod: z.enum(["stripe", "cash"], {
    required_error: "Please select how you would like to pay.",
  }),
  reason: z.string()
    .min(10, { message: "Please provide more details (at least 10 characters)." })
    .max(500, { message: "Reason must not exceed 500 characters." }),
});

type ServiceBookingFormValues = z.infer<typeof serviceBookingSchema>;

// Generate 1-hour time slots (e.g., 1:00-2:00, 3:00-4:00)
const generateHourlyTimeSlots = (startHour: number = 9, endHour: number = 17) => {
  const slots: { value: string; label: string; endTime: string }[] = [];
  for (let hour = startHour; hour < endHour; hour++) {
    const startTime = `${hour.toString().padStart(2, "0")}:00`;
    const endTime = `${(hour + 1).toString().padStart(2, "0")}:00`;
    const displayTime = new Date(`2000-01-01T${startTime}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    slots.push({
      value: startTime,
      label: `${displayTime} - ${new Date(`2000-01-01T${endTime}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`,
      endTime
    });
  }
  return slots;
};

interface ServiceBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: {
    id: string;
    name: string;
    description: string;
    specialty: string;
    duration_minutes: number;
    price_min: number;
    price_max: number | null;
  };
  dentist: {
    id: string;
    name: string;
    email: string;
    specialization: string;
  };
  onSuccess?: (data: {
    appointmentId: string;
    date: string;
    time: string;
    paymentMethod: "stripe" | "cash";
    paymentStatus: "pending" | "paid";
  }) => void;
}

export function ServiceBookingModal({
  open,
  onOpenChange,
  service,
  dentist,
  onSuccess,
}: ServiceBookingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { initiateCheckout, isProcessing: isStripeProcessing, error: stripeError } = useStripeCheckout();

  const timeSlots = generateHourlyTimeSlots();

  const form = useForm<ServiceBookingFormValues>({
    resolver: zodResolver(serviceBookingSchema),
    defaultValues: {
      patientName: "",
      patientEmail: "",
      phone: "",
      reason: "",
      time: "",
      paymentMethod: "cash",
    },
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setError(null);
    }
  }, [open, form]);

  const onSubmit = async (data: ServiceBookingFormValues) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to book a service.",
        variant: "default",
      });
      navigate('/auth');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const appointmentData = {
        patient_id: user.id,
        patient_name: data.patientName,
        patient_email: data.patientEmail,
        patient_phone: data.phone,
        dentist_id: dentist.id,
        dentist_name: dentist.name,
        dentist_email: dentist.email,
        appointment_date: format(data.date, "yyyy-MM-dd"),
        appointment_time: data.time,
        appointment_type: service.name,
        appointment_reason: data.reason,
        estimated_price: service.price_min,
        status: 'upcoming',
        payment_method: data.paymentMethod,
        payment_status: 'pending',
        booking_source: 'service_booking',
      };

      const { data: appointment, error: appointmentError } = await (supabase as any)
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();

      if (appointmentError) {
        throw new Error(appointmentError.message || "Failed to create appointment.");
      }

      if (!appointment) {
        throw new Error("Failed to create appointment. Please try again.");
      }

      const appointmentId = appointment.id;

      // Handle payment method
      if (data.paymentMethod === "stripe") {
        toast({
          title: "Redirecting to payment...",
          description: "Please complete your payment to confirm the appointment.",
        });

        try {
          await initiateCheckout({
            appointmentId,
            amount: service.price_min * 100, // Convert to cents
            currency: "usd",
            dentistName: dentist.name,
            patientEmail: data.patientEmail,
            appointmentDate: format(data.date, "yyyy-MM-dd"),
            appointmentTime: data.time,
          });
        } catch (stripeErr) {
          const stripeErrorMessage = stripeErr instanceof Error
            ? stripeErr.message
            : "Payment initialization failed. Please try again.";

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
        // Cash payment - show success
        toast({
          title: "Service booked successfully!",
          description: `Your ${service.name} appointment with ${dentist.name} has been confirmed for ${format(data.date, "PPP")} at ${data.time}.`,
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

        form.reset();
        onOpenChange(false);
      }
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : "Failed to book service. Please try again.";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book {service.name} with {dentist.name}</DialogTitle>
          <DialogDescription>
            {service.description}. Duration: {service.duration_minutes} minutes. Price: ${service.price_min}{service.price_max ? ` - $${service.price_max}` : ''}
          </DialogDescription>
        </DialogHeader>

        <ErrorBoundary>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
              {/* Patient Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <FormField
                  control={form.control}
                  name="patientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john.doe@example.com" {...field} disabled={isSubmitting || isStripeProcessing} />
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
                        <Input type="tel" placeholder="+1 (555) 123-4567" {...field} disabled={isSubmitting || isStripeProcessing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Reason for Visit */}
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Visit</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please describe why you need this service..."
                        className="min-h-[100px]"
                        {...field}
                        disabled={isSubmitting || isStripeProcessing}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide details about your dental concerns or what you hope to achieve with this service
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date and Time */}
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
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
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
                      <FormLabel>Appointment Time (1-hour slots)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting || isStripeProcessing}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a time slot" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeSlots.map((slot) => (
                            <SelectItem key={slot.value} value={slot.value}>
                              {slot.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Each slot is 1 hour long
                      </FormDescription>
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
                        className="flex flex-col space-y-2"
                        disabled={isSubmitting || isStripeProcessing}
                      >
                        <div className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 hover:bg-accent cursor-pointer">
                          <RadioGroupItem value="cash" id="cash" className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor="cash" className="font-medium cursor-pointer flex items-center gap-2">
                              <Banknote className="h-4 w-4" />
                              Cash Payment
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              Pay at your appointment
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 hover:bg-accent cursor-pointer">
                          <RadioGroupItem value="stripe" id="stripe" className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor="stripe" className="font-medium cursor-pointer flex items-center gap-2">
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
                      Choose how you would like to pay (${service.price_min}{service.price_max ? ` - $${service.price_max}` : ''})
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
                    {isStripeProcessing ? "Redirecting to payment..." : "Booking Service..."}
                  </>
                ) : (
                  <>
                    {form.watch("paymentMethod") === "stripe" ? (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Continue to Payment
                      </>
                    ) : (
                      "Book Service"
                    )}
                  </>
                )}
              </Button>
            </form>
          </Form>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}


