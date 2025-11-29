import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";

interface Review {
  id: string;
  patientName: string;
  rating: number;
  comment: string;
  date: string;
  verified?: boolean;
}

// Virtual reviews data - in production, this would come from a database
const generateVirtualReviews = (dentistName: string): Review[] => {
  const reviews: Review[] = [
    {
      id: "1",
      patientName: "Sarah M.",
      rating: 5,
      comment: `Dr. ${dentistName} is absolutely amazing! Very professional, gentle, and explains everything clearly. The office is clean and modern. Highly recommend!`,
      date: "2 weeks ago",
      verified: true,
    },
    {
      id: "2",
      patientName: "Michael T.",
      rating: 5,
      comment: `Excellent experience! Dr. ${dentistName} made me feel comfortable throughout the entire procedure. The staff is friendly and the service is top-notch.`,
      date: "1 month ago",
      verified: true,
    },
    {
      id: "3",
      patientName: "Emily R.",
      rating: 5,
      comment: `I've been coming to Dr. ${dentistName} for over a year now. Always professional, on time, and the results speak for themselves. Couldn't be happier!`,
      date: "3 weeks ago",
      verified: true,
    },
    {
      id: "4",
      patientName: "James W.",
      rating: 4,
      comment: `Great dentist! Very knowledgeable and patient. The only reason I'm giving 4 stars instead of 5 is because the wait time was a bit long, but the service was worth it.`,
      date: "1 month ago",
      verified: true,
    },
    {
      id: "5",
      patientName: "Lisa K.",
      rating: 5,
      comment: `Dr. ${dentistName} is the best dentist I've ever been to! Very thorough, explains everything, and genuinely cares about your dental health. The office has state-of-the-art equipment too.`,
      date: "2 months ago",
      verified: true,
    },
    {
      id: "6",
      patientName: "Robert B.",
      rating: 5,
      comment: `Outstanding service! Dr. ${dentistName} and the entire team are professional, friendly, and make you feel at ease. I've recommended them to all my friends and family.`,
      date: "3 weeks ago",
      verified: true,
    },
  ];

  return reviews;
};

interface DentistReviewsProps {
  dentistName: string;
  averageRating?: number;
  totalReviews?: number;
}

export function DentistReviews({ dentistName, averageRating = 4.9, totalReviews = 24 }: DentistReviewsProps) {
  const reviews = generateVirtualReviews(dentistName);

  return (
    <div className="space-y-6">
      {/* Reviews Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h2 className="text-3xl font-bold mb-2">Patient Reviews</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.floor(averageRating)
                        ? "text-yellow-500 fill-yellow-500"
                        : i < averageRating
                        ? "text-yellow-500 fill-yellow-500 opacity-50"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-lg font-semibold ml-2">{averageRating.toFixed(1)}</span>
            </div>
            <span className="text-muted-foreground">({totalReviews} reviews)</span>
          </div>
        </div>
      </div>

      {/* Reviews Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {reviews.map((review, index) => (
          <div 
            key={review.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-primary">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-lg">{review.patientName}</h4>
                      {review.verified && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating
                              ? "text-yellow-500 fill-yellow-500"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">{review.date}</p>
                  </div>
                  <Quote className="h-8 w-8 text-primary/20 flex-shrink-0" />
                </div>
                <p className="text-muted-foreground leading-relaxed">{review.comment}</p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Review Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        {[
          { label: "5 Stars", value: "92%", color: "bg-green-500" },
          { label: "4 Stars", value: "6%", color: "bg-blue-500" },
          { label: "3 Stars", value: "2%", color: "bg-yellow-500" },
          { label: "Would Recommend", value: "98%", color: "bg-primary" },
        ].map((stat, index) => (
          <div
            key={stat.label}
            className="animate-fade-in-scale"
            style={{ animationDelay: `${0.6 + index * 0.1}s` }}
          >
            <Card className="text-center p-4 hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className={`w-12 h-12 ${stat.color} rounded-full mx-auto mb-2 flex items-center justify-center`}>
                  <span className="text-white font-bold text-lg">{stat.value}</span>
                </div>
                <p className="text-sm font-medium">{stat.label}</p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

