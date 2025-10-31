import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, CreditCard, Banknote, AlertCircle, Upload, X, ChevronDown, ChevronUp } from "lucide-react";
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
  
  // Medical History
  smoking: z.boolean().default(false),
  medications: z.string().optional(),
  allergies: z.string().optional(),
  previousDentalWork: z.string().optional(),
  medicalHistory: z.string().optional(),
  
  // Payment
  paymentMethod: z.enum(["stripe", "cash"], {
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
    paymentMethod: "stripe" | "cash";
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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isMedicalHistoryOpen, setIsMedicalHistoryOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { initiateCheckout, isProcessing: isStripeProcessing, error: stripeError } = useStripeCheckout();

  const form = useForm<EnhancedBookingFormValues>({
    resolver: zodResolver(enhancedBookingFormSchema),
    defaultValues: {
      patientName: "",
      patientEmail: "",
      phone: "",
      chiefComplaint: "",
      symptoms: "",
      smoking: false,
      medications: "",
      allergies: "",
      previousDentalWork: "",
      medicalHistory: "",
      time: "",
      paymentMethod: "cash",
    },
  });

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

    const uploadedUrls: string[] = [];

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

        // Save document record
        await supabase
          .from('medical_documents')
          .insert({
            appointment_id: appointmentId,
            patient_id: user?.id,
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_type: file.type,
            file_size: file.size,
            description: `Uploaded during appointment booking`
          });

        uploadedUrls.push(urlData.publicUrl);
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }

    return uploadedUrls;
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
          dentist_id: dentistId,
          dentist_email: dentistEmail,
          appointment_date: format(data.date, "yyyy-MM-dd"),
          appointment_time: data.time,
          chief_complaint: data.chiefComplaint,
          symptoms: data.symptoms,
          medical_history: data.medicalHistory,
          smoking: data.smoking,
          medications: data.medications,
          allergies: data.allergies,
          previous_dental_work: data.previousDentalWork,
          cause_identified: true, // Manual booking assumes cause is identified
          status: 'upcoming',
          payment_method: data.paymentMethod,
          payment_status: 'pending',
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

      // Upload files if any
      if (uploadedFiles.length > 0) {
        await uploadFiles(appointmentId);
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

      // Handle payment method
      if (data.paymentMethod === "stripe") {
        toast({
          title: "Redirecting to payment...",
          description: "Please complete your payment to confirm the appointment.",
        });

        try {
          await initiateCheckout({
            appointmentId,
            amount: 5000, // $50.00 in cents
            currency: "usd",
            dentistName,
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
        // Cash payment - show success immediately
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
        setUploadedFiles([]);
      }
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
            </div>

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
                          onSelect={field.onChange}
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
                        {timeSlots.map((slot) => (
                          <SelectItem key={slot.value} value={slot.value}>
                            {slot.label}
                          </SelectItem>
                        ))}
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
                      className="flex flex-col space-y-2"
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
