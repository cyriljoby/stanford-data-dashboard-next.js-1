"use client";
import FormContainer from "@/components/form/FormContainer";
import { SubmitButton } from "@/components/form/Buttons";
import { useState, useEffect } from "react";
import countries from "@/data/countries";
import states from "@/data/states";
import { getRequiredLocationFields, fetchLocations } from "@/utils/helpers";
import LocationComboBox from "./LocationComboBox";
import MultiplePeriodsCheckbox from "./MultiplePeriodsCheckbox";
import { Roles } from "@prisma/client";
import { Input } from "../ui/input";
import { actionFunction } from "@/utils/types";
import { toast } from "sonner";
import { redirect } from "next/navigation";

const SelectUserLocationForm = ({
  role,
  isTeacher,
  action,
  locationId,
  formId,
  selectedUserCanAccessNonUS,
  storeLocallyOnly = false,
}: {
  role: Roles;
  isTeacher: boolean;
  action?: actionFunction;
  locationId?: string;
  formId?: string;
  selectedUserCanAccessNonUS?: boolean;
  storeLocallyOnly?: boolean;
}) => {
  const [userLocation, setUserLocation] = useState({
    country: "UNITED STATES",
    state: "",
    county: "",
    city: "",
    district: "",
    school: "",
  });

  const {
    canAccessNonUS,
    isUSA,
    requireState,
    requireCounty,
    requireDistrict,
    requireCityAndSchool,
  } = getRequiredLocationFields({
    country: userLocation.country,
    role,
    isTeacher,
  });

  const displayCountries = (
    locationId ? selectedUserCanAccessNonUS : canAccessNonUS
  )
    ? countries
    : ["UNITED STATES"];

  const [counties, setCounties] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [schools, setSchools] = useState<string[]>([]);

  useEffect(() => {
    setUserLocation((prev) => ({
      ...prev,
      state: "",
      county: "",
      city: "",
      district: "",
      school: "",
    }));

    setCounties([]);
    setCities([]);
    setDistricts([]);
    setSchools([]);

    const updateCitiesForNonUS = async () => {
      if (!isUSA && requireCityAndSchool) {
        const cities = await fetchLocations("city", {
          country: userLocation.country,
        });
        setCities(cities);
      }
    };

    updateCitiesForNonUS();
  }, [userLocation.country]);

  useEffect(() => {
    setUserLocation((prev) => ({
      ...prev,
      county: "",
      city: "",
      district: "",
      school: "",
    }));
    setSchools([]);
    setDistricts([]);

    const updateFromState = async () => {
      if (!userLocation.state) return;

      if (requireCityAndSchool) {
        const cities = await fetchLocations("city", {
          country: userLocation.country,
          state: userLocation.state,
        });
        setCities(cities);
      } else if (requireCounty) {
        const counties = await fetchLocations("county", {
          country: userLocation.country,
          state: userLocation.state,
        });
        setCounties(counties);
      }
    };

    updateFromState();
  }, [userLocation.state]);

  useEffect(() => {
    setUserLocation((prev) => ({ ...prev, district: "" }));

    const updateDistricts = async () => {
      if (userLocation.county && requireDistrict) {
        const districts = await fetchLocations("district", {
          country: userLocation.country,
          state: userLocation.state,
          county: userLocation.county,
        });
        setDistricts(districts);
      }
    };

    updateDistricts();
  }, [userLocation.county]);

  useEffect(() => {
    setUserLocation((prev) => ({ ...prev, school: "" }));

    const updateSchools = async () => {
      if (userLocation.city) {
        const schoolQuery: { country: string; state?: string; city: string } = {
          country: userLocation.country,
          city: userLocation.city,
        };

        if (isUSA) {
          schoolQuery.state = userLocation.state;
        }

        const schools = await fetchLocations("school", schoolQuery);
        setSchools(schools);
      }
    };

    updateSchools();
  }, [userLocation.city]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !userLocation.country ||
      !userLocation.city ||
      !userLocation.school ||
      (userLocation.country === "UNITED STATES" && !userLocation.state)
    ) {
      toast.error("Please fill out all required location fields");
      return;
    }

    localStorage.setItem("studentLocation", JSON.stringify(userLocation));
    redirect(`/student/details/${formId}/0/notapplicable`);
  };

  const renderFormContents = () => {
    const submitBtnText = storeLocallyOnly ? "next" : "add location";

    return (
      <>
        <Input type="hidden" name="role" value={role} />
        <Input
          type="hidden"
          name="isTeacher"
          value={isTeacher ? "true" : "false"}
        />
        {role === Roles.stanford && (
          <Input type="hidden" name="locationId" value={locationId} />
        )}
        <LocationComboBox
          name="country"
          value={userLocation.country}
          onChange={(country) =>
            setUserLocation((prev) => ({ ...prev, country }))
          }
          options={displayCountries}
        />
        {requireState && (
          <LocationComboBox
            name="state"
            value={userLocation.state}
            onChange={(state) =>
              setUserLocation((prev) => ({ ...prev, state }))
            }
            options={states}
          />
        )}
        {requireCounty && (
          <LocationComboBox
            name="county"
            value={userLocation.county}
            onChange={(county) =>
              setUserLocation((prev) => ({ ...prev, county }))
            }
            options={counties}
          />
        )}
        {requireDistrict && (
          <LocationComboBox
            name="district"
            value={userLocation.district}
            onChange={(district) =>
              setUserLocation((prev) => ({ ...prev, district }))
            }
            options={districts}
          />
        )}
        {requireCityAndSchool && (
          <>
            <LocationComboBox
              name="city"
              value={userLocation.city}
              onChange={(city) =>
                setUserLocation((prev) => ({ ...prev, city }))
              }
              options={cities}
            />
            <LocationComboBox
              name="school"
              value={userLocation.school}
              onChange={(school) =>
                setUserLocation((prev) => ({ ...prev, school }))
              }
              options={schools}
            />
          </>
        )}
        {role !== Roles.stanford && <MultiplePeriodsCheckbox />}
        <SubmitButton text={submitBtnText} className="w-full mt-4" />
      </>
    );
  };

  return storeLocallyOnly ? (
    <form onSubmit={handleSubmit}>{renderFormContents()}</form>
  ) : action ? (
    <FormContainer action={action}>{renderFormContents()}</FormContainer>
  ) : (
    <></>
  );
};

export default SelectUserLocationForm;
