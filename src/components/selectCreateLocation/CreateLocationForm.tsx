"use client";
import { useEffect, useState } from "react";
import FormContainer from "../form/FormContainer";
import { createLocation } from "@/utils/actions";
import countries from "@/data/countries";
import LocationComboBox from "./LocationComboBox";
import states from "@/data/states";
import FormInput from "../form/FormInput";
import { Roles } from "@prisma/client";
import MultiplePeriodsCheckbox from "./MultiplePeriodsCheckbox";
import { SubmitButton } from "../form/Buttons";
import { Input } from "../ui/input";
import { fetchLocations } from "@/utils/helpers";

const CreateLocationForm = ({
  role,
  isTeacher,
}: {
  role: Roles;
  isTeacher: boolean;
}) => {
  const [location, setLocation] = useState({
    country: "UNITED STATES",
    state: "",
    county: "",
    city: "",
    district: "",
    school: "",
  });

  const [counties, setCounties] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  const isUSA = location.country === "UNITED STATES";

  useEffect(() => {
    setLocation((prev) => ({
      ...prev,
      state: "",
      county: "",
      city: "",
      district: "",
    }));

    setCounties([]);
    setDistricts([]);
    setCities([]);
  }, [location.country]);

  useEffect(() => {
    const updateCounties = async () => {
      setLocation((prev) => ({
        ...prev,
        county: "",
        city: "",
        district: "",
      }));
      setDistricts([]);
      setCities([]);

      if (location.state) {
        const counties = await fetchLocations("county", {
          country: location.country,
          state: location.state,
        });
        setCounties(counties);
      }
    };

    updateCounties();
  }, [location.state]);

  useEffect(() => {
    const updateDistricts = async () => {
      setLocation((prev) => ({ ...prev, district: "", city: "" }));
      setCities([]);

      if (location.county) {
        const districts = await fetchLocations("district", {
          country: location.country,
          state: location.state,
          county: location.county,
        });
        setDistricts(districts);
      }
    };

    updateDistricts();
  }, [location.county]);

  useEffect(() => {
    const updateCities = async () => {
      setLocation((prev) => ({ ...prev, city: "" }));

      if (location.district) {
        const cities = await fetchLocations("city", {
          country: location.country,
          state: location.state,
          county: location.county,
          district: location.district,
        });
        setCities(cities);
      }
    };

    updateCities();
  }, [location.district]);

  return (
    <FormContainer action={createLocation}>
      <Input type="hidden" name="role" value={role} />
      <Input
        type="hidden"
        name="isTeacher"
        value={isTeacher ? "true" : "false"}
      />
      <LocationComboBox
        name="country"
        value={location.country}
        onChange={(country) => setLocation((prev) => ({ ...prev, country }))}
        options={countries}
      />
      {isUSA && (
        <>
          <LocationComboBox
            name="state"
            value={location.state}
            onChange={(state) => setLocation((prev) => ({ ...prev, state }))}
            options={states}
          />
          <LocationComboBox
            name="county"
            value={location.county}
            onChange={(county) => setLocation((prev) => ({ ...prev, county }))}
            options={counties}
          />
          <LocationComboBox
            name="district"
            value={location.district}
            onChange={(district) =>
              setLocation((prev) => ({ ...prev, district }))
            }
            options={districts}
          />
          <LocationComboBox
            name="city"
            value={location.city}
            onChange={(city) => setLocation((prev) => ({ ...prev, city }))}
            options={cities}
          />
        </>
      )}
      {!isUSA && (
        <FormInput name="city" type="text" placeholder="Enter your city name" />
      )}
      <FormInput
        name="school"
        type="text"
        placeholder="Enter your school name"
      />
      <MultiplePeriodsCheckbox />
      <SubmitButton text="request location" className="w-full mt-4" />
    </FormContainer>
  );
};

export default CreateLocationForm;
