"use client";

import { UserLocation } from "@prisma/client";
import SelectInput from "../form/SelectInput";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

const SchoolAndPeriodInput = ({
  teacherLocations,
}: {
  teacherLocations: UserLocation[];
}) => {
  const [multiplePeriods, setMultiplePeriods] = useState(false);

  const periods = Array.from({ length: 11 }, (_, i) => {
    return { text: i.toString(), value: i.toString() };
  });

  const onLocationValueChange = (locationId: string) => {
    const location = teacherLocations.find(
      (teacherLocation) => teacherLocation.id === locationId
    );

    if (location) {
      setMultiplePeriods(location.multiplePeriods);
    }
  };

  return (
    <div>
      <Select
        name="locationId"
        onValueChange={(value) => onLocationValueChange(value)}
        required
      >
        <SelectTrigger className="w-full mt-3 capitalize">
          <SelectValue placeholder="select your school" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel className="capitalize">school</SelectLabel>
            {teacherLocations.map((teacherLocation) => {
              const { id, school } = teacherLocation;
              return (
                <SelectItem key={id} value={id} className="capitalize">
                  {school}
                </SelectItem>
              );
            })}
          </SelectGroup>
        </SelectContent>
      </Select>
      {multiplePeriods && (
        <SelectInput
          name="period"
          placeholder="select your period"
          options={periods}
        />
      )}
    </div>
  );
};

export default SchoolAndPeriodInput;
