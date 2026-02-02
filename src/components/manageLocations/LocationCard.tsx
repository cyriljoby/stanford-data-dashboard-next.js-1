import React from "react";
import { Card, CardContent, CardFooter } from "../ui/card";
import { Separator } from "../ui/separator";
import { UserLocationWithUser } from "@/utils/types";
import LocationCardBtns from "./LocationCardBtns";

const LocationCard = ({ location }: { location: UserLocationWithUser }) => {
  const isUSA = location.country === "UNITED STATES";

  return (
    <Card className="mb-5">
      <CardContent>
        <h4 className="font-medium text-lg mb-2">
          {location.user.name} ({location.user.email})
        </h4>
        <div className="mb-4 text-muted-foreground">
          {isUSA ? (
            <>
              <p>
                {location.school}, {location.city}
              </p>
              <p>
                {location.district}, {location.county}
              </p>
              <p>
                {location.state}, {location.country}
              </p>
            </>
          ) : (
            <>
              <p>{location.school}</p>
              <p>
                {location.city}, {location.country}
              </p>
            </>
          )}
        </div>
        <Separator />
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <LocationCardBtns locationId={location.id} />
      </CardFooter>
    </Card>
  );
};

export default LocationCard;
