import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function PaymentCancel() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  const appointmentIdParam = searchParams.get('appointment_id');

  useEffect(() => {
    if (appointmentIdParam) {
      setAppointmentId(appointmentIdParam);
    }
  }, [appointmentIdParam]);

  const retryPayment = async () => {
    if (!appointmentId) {
      toast({
        title: "Error",
        description: "No appointment ID found. Please try booking again.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Update appointment status to allow retry
      const { error } = await supabase
        .from('appointments')
        .update({
          payment_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) {
        console.error('Error updating appointment:', error);
        toast({
          title: "Error",
          description: "Failed to reset payment status. Please contact support.",
          variant: "destructive"
        });
        return;
      }

      // Navigate back to booking form or dashboard
      navigate('/dashboard');
      toast({
        title: "Payment Reset",
        description: "You can now retry the payment process.",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cancel Header */}
        <div className="text-center mb-8">
          <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Cancelled</h1>
          <p className="text-lg text-gray-600">
            Your payment was cancelled. No charges have been made to your account.
          </p>
        </div>

        {/* Information Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-red-600">What happened?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-700">
                Your payment process was cancelled. This can happen for several reasons:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>You clicked the "Back" button during payment</li>
                <li>You closed the payment window</li>
                <li>There was a technical issue with the payment processor</li>
                <li>You decided not to complete the payment</li>
              </ul>
              <p className="text-gray-700">
                <strong>Don't worry!</strong> Your appointment is still reserved and you can complete the payment at any time.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Button
            onClick={retryPayment}
            className="w-full"
            size="lg"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Payment
          </Button>

          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        {/* Alternative Payment Options */}
        <Card>
          <CardHeader>
            <CardTitle>Alternative Payment Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Pay with Cash</h3>
                <p className="text-sm text-blue-700 mb-3">
                  You can choose to pay with cash when you arrive for your appointment.
                </p>
                <Button
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                  size="sm"
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  Book with Cash Payment
                </Button>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">Contact Support</h3>
                <p className="text-sm text-green-700 mb-3">
                  If you're experiencing issues with online payment, our support team can help.
                </p>
                <Button
                  onClick={() => navigate('/contact')}
                  variant="outline"
                  size="sm"
                  className="border-green-300 text-green-700 hover:bg-green-100"
                >
                  Contact Support
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">1</span>
                </div>
                <div>
                  <p className="font-medium">Check Your Internet Connection</p>
                  <p className="text-sm text-gray-600">Ensure you have a stable internet connection before retrying.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">2</span>
                </div>
                <div>
                  <p className="font-medium">Try a Different Payment Method</p>
                  <p className="text-sm text-gray-600">Use a different credit card or payment method if available.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">3</span>
                </div>
                <div>
                  <p className="font-medium">Contact Support</p>
                  <p className="text-sm text-gray-600">If problems persist, contact our support team for assistance.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}