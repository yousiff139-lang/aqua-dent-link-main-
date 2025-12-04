import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { DayAvailability } from '@/types/admin';

interface WeeklyAvailabilityInputProps {
    value: DayAvailability[];
    onChange: (availability: DayAvailability[]) => void;
}

const DAYS_OF_WEEK = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
];

export const WeeklyAvailabilityInput = ({ value, onChange }: WeeklyAvailabilityInputProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleDayToggle = (dayOfWeek: number, enabled: boolean) => {
        if (enabled) {
            // Add day with default times
            const newDay: DayAvailability = {
                day_of_week: dayOfWeek,
                start_time: '09:00',
                end_time: '17:00',
                slot_duration_minutes: 30,
                is_available: true,
            };
            onChange([...value, newDay].sort((a, b) => a.day_of_week - b.day_of_week));
        } else {
            // Remove day
            onChange(value.filter((a) => a.day_of_week !== dayOfWeek));
        }
    };

    const handleTimeChange = (
        dayOfWeek: number,
        field: 'start_time' | 'end_time',
        newValue: string
    ) => {
        onChange(
            value.map((a) =>
                a.day_of_week === dayOfWeek ? { ...a, [field]: newValue } : a
            )
        );
    };

    const handleSlotDurationChange = (dayOfWeek: number, newValue: number) => {
        onChange(
            value.map((a) =>
                a.day_of_week === dayOfWeek ? { ...a, slot_duration_minutes: newValue } : a
            )
        );
    };

    const getDayAvailability = (dayOfWeek: number): DayAvailability | undefined => {
        return value.find((a) => a.day_of_week === dayOfWeek);
    };

    // Initialize with default Monday-Friday schedule
    const initializeDefaultSchedule = () => {
        const defaultSchedule = DAYS_OF_WEEK.slice(1, 6).map((day) => ({
            day_of_week: day.value,
            start_time: '09:00',
            end_time: '17:00',
            slot_duration_minutes: 30,
            is_available: true,
        }));
        onChange(defaultSchedule);
    };

    return (
        <Card className="border-0 shadow-lg">
            <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary" />
                            Available Times
                            <span className="text-sm font-normal text-muted-foreground">
                                (Optional)
                            </span>
                        </CardTitle>
                        <CardDescription className="mt-2">
                            Set the dentist's initial weekly availability schedule. They can modify this later from their portal.
                        </CardDescription>
                    </div>
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                </div>
            </CardHeader>

            {isExpanded && (
                <CardContent className="space-y-4">
                    {value.length === 0 && (
                        <div className="text-center py-6 bg-muted/50 rounded-lg">
                            <p className="text-muted-foreground mb-3">No availability set</p>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={initializeDefaultSchedule}
                            >
                                Use Default Schedule (Mon-Fri, 9 AM - 5 PM)
                            </Button>
                        </div>
                    )}

                    {DAYS_OF_WEEK.map((day) => {
                        const dayAvail = getDayAvailability(day.value);
                        const isEnabled = !!dayAvail;

                        return (
                            <div key={day.value} className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id={`day-toggle-${day.value}`}
                                            checked={isEnabled}
                                            onChange={(e) => handleDayToggle(day.value, e.target.checked)}
                                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                        />
                                        <Label htmlFor={`day-toggle-${day.value}`} className="text-base font-medium cursor-pointer">
                                            {day.label}
                                        </Label>
                                    </div>
                                </div>

                                {isEnabled && dayAvail && (
                                    <div className="ml-11 grid gap-4 md:grid-cols-3 p-4 bg-muted/50 rounded-lg">
                                        <div className="space-y-2">
                                            <Label htmlFor={`start-${day.value}`} className="text-sm">
                                                Start Time
                                            </Label>
                                            <Input
                                                id={`start-${day.value}`}
                                                type="time"
                                                value={dayAvail.start_time}
                                                onChange={(e) =>
                                                    handleTimeChange(day.value, 'start_time', e.target.value)
                                                }
                                                className="w-full"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor={`end-${day.value}`} className="text-sm">
                                                End Time
                                            </Label>
                                            <Input
                                                id={`end-${day.value}`}
                                                type="time"
                                                value={dayAvail.end_time}
                                                onChange={(e) =>
                                                    handleTimeChange(day.value, 'end_time', e.target.value)
                                                }
                                                className="w-full"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor={`duration-${day.value}`} className="text-sm">
                                                Slot Duration (min)
                                            </Label>
                                            <Input
                                                id={`duration-${day.value}`}
                                                type="number"
                                                min="5"
                                                max="240"
                                                step="5"
                                                value={dayAvail.slot_duration_minutes}
                                                onChange={(e) =>
                                                    handleSlotDurationChange(day.value, parseInt(e.target.value, 10) || 30)
                                                }
                                                className="w-full"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {value.length > 0 && (
                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onChange([])}
                            >
                                Clear All
                            </Button>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
};
