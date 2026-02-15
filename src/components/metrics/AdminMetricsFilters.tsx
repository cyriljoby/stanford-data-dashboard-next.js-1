"use client";
import { Roles, UserLocation } from "@prisma/client";
import { useEffect, useState } from "react";
import FormContainer from "../form/FormContainer";
import { downloadData } from "@/utils/actions";
import LocationComboBox from "../selectCreateLocation/LocationComboBox";
import countries from "@/data/countries";
import states from "@/data/states";
import { fetchLocations } from "@/utils/helpers";
import { Label } from "../ui/label";
import SelectInput from "../form/SelectInput";
import { SubmitButton } from "../form/Buttons";
import { Button } from "../ui/button";
import { DatePicker } from "../ui/date-picker";

const AdminMetricsFilters = ({
  role,
  adminLocation,
  forms,
  firstResponseDate,
}: {
  role: Roles;
  adminLocation: UserLocation | null;
  forms: string[];
  firstResponseDate?: Date;
}) => {
  let isUSA = adminLocation?.country === "UNITED STATES";
  const fixedCountry = role != Roles.stanford;
  const fixedState = isUSA && fixedCountry && role != Roles.country;
  const fixedCounty = fixedState && role != Roles.state;
  const fixedDistrict = fixedCounty && role != Roles.county;
  const fixedCityAndSchool = role == Roles.site;
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(
    firstResponseDate
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const handleExport = async (prevState: any, formData: FormData) => {
    try {
      setLoading(true);
      const paramsObj: Record<string, string> = {};

      console.log("FORM DATA ENTRIES:");
      for (const [key, value] of formData.entries()) {
        console.log(key, value);
        if (value && value !== "All") paramsObj[key] = String(value);
      }

      // Add date filters if set
      if (startDate) {
        paramsObj.startDate = startDate.toISOString().split("T")[0];
      }
      if (endDate) {
        paramsObj.endDate = endDate.toISOString().split("T")[0];
      }

      await downloadData(paramsObj);

      return { success: true, message: "Successfully downloaded export file" };
    } catch (err) {
      console.error(err);
      return { success: false, message: "Export failed", errorMessage: true };
    } finally {
      setLoading(false);
    }
  };

  const [location, setLocation] = useState({
    country: fixedCountry ? (adminLocation?.country as string) : "UNITED STATES",
    state: fixedState ? (adminLocation?.state as string) : "All",
    county: fixedCounty ? (adminLocation?.county as string) : "All",
    district: fixedDistrict ? (adminLocation?.district as string) : "All",
    city: fixedCityAndSchool ? (adminLocation?.city as string) : "All",
    school: fixedCityAndSchool ? (adminLocation?.school as string) : "All",
  });

  isUSA = location.country === "UNITED STATES";

  const [counties, setCounties] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [schools, setSchools] = useState<string[]>([]);

  useEffect(() => {
    if (fixedCountry) return;

    setLocation((prev) => ({
      ...prev,
      state: "All",
      county: "All",
      city: "All",
      district: "All",
    }));

    setCounties([]);
    setDistricts([]);
    setCities([]);
    setSchools([]);

    if (!isUSA && location.country !== "All") {
      const updateCitiesForNonUS = async () => {
        const cities = await fetchLocations("city", {
          country: location.country,
        });
        setCities(cities);
      };

      updateCitiesForNonUS();
    }
  }, [location.country]);

  useEffect(() => {
    if (fixedState) return;

    const updateCounties = async () => {
      setLocation((prev) => ({
        ...prev,
        county: "All",
        city: "All",
        district: "All",
        school: "All",
      }));
      setCounties([]);
      setDistricts([]);
      setCities([]);
      setSchools([]);

      if (location.state !== "All") {
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
    if (fixedCounty) return;

    const updateDistricts = async () => {
      setLocation((prev) => ({
        ...prev,
        district: "All",
        city: "All",
        school: "All",
      }));
      setDistricts([]);
      setCities([]);
      setSchools([]);

      if (location.county !== "All") {
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
    if (fixedCityAndSchool) return;

    const updateCities = async () => {
      setLocation((prev) => ({ ...prev, city: "All", school: "All" }));
      setCities([]);
      setSchools([]);

      if (location.district !== "All") {
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

  useEffect(() => {
    if (fixedCityAndSchool) return;

    const updateSchools = async () => {
      setLocation((prev) => ({ ...prev, school: "All" }));
      setSchools([]);

      if (location.city !== "All") {
        const schoolQuery: {
          country: string;
          state?: string;
          county?: string;
          district?: string;
          city: string;
        } = {
          country: location.country,
          city: location.city,
        };

        if (isUSA) {
          schoolQuery.state = location.state;
          schoolQuery.county = location.county;
          schoolQuery.district = location.district;
        }

        const schools = await fetchLocations("school", schoolQuery);
        setSchools(schools);
      }
    };

    updateSchools();
  }, [location.city]);

  return (
    <FormContainer action={handleExport}>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label>Country</Label>
          <LocationComboBox
            name="country"
            value={location.country}
            onChange={(country) =>
              setLocation((prev) => ({ ...prev, country }))
            }
            options={
              fixedCountry
                ? [adminLocation?.country as string]
                : ["All", ...countries]
            }
            marginBottom={0}
          />
        </div>
        {isUSA && (
          <>
            <div>
              <Label>State</Label>
              <LocationComboBox
                name="state"
                value={location.state}
                onChange={(state) =>
                  setLocation((prev) => ({ ...prev, state }))
                }
                options={
                  fixedState
                    ? [adminLocation?.state as string]
                    : ["All", ...states]
                }
                marginBottom={0}
              />
            </div>
            <div>
              <Label>County</Label>
              <LocationComboBox
                name="county"
                value={location.county}
                onChange={(county) =>
                  setLocation((prev) => ({ ...prev, county }))
                }
                options={
                  fixedCounty
                    ? [adminLocation?.county as string]
                    : ["All", ...counties]
                }
                marginBottom={0}
              />
            </div>
            <div>
              <Label>District</Label>
              <LocationComboBox
                name="district"
                value={location.district}
                onChange={(district) =>
                  setLocation((prev) => ({ ...prev, district }))
                }
                options={
                  fixedDistrict
                    ? [adminLocation?.district as string]
                    : ["All", ...districts]
                }
                marginBottom={0}
              />
            </div>
          </>
        )}
        <div>
          <Label>City</Label>
          <LocationComboBox
            name="city"
            value={location.city}
            onChange={(city) => setLocation((prev) => ({ ...prev, city }))}
            options={
              fixedCityAndSchool
                ? [adminLocation?.city as string]
                : ["All", ...cities]
            }
            marginBottom={0}
          />
        </div>
        <div>
          <Label>School</Label>
          <LocationComboBox
            name="school"
            value={location.school}
            onChange={(school) => setLocation((prev) => ({ ...prev, school }))}
            options={
              fixedCityAndSchool
                ? [adminLocation?.school as string]
                : ["All", ...schools]
            }
            marginBottom={0}
          />
        </div>
        <div>
          <Label>Form</Label>
          <SelectInput
            name="form"
            placeholder="Select a form"
            options={[
              { text: "All", value: "All" },
              ...forms.map((form) => ({ text: form, value: form })),
            ]}
            defaultValue="All"
            withMargin={false}
          />
        </div>
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <DatePicker
            date={startDate}
            onDateChange={setStartDate}
            placeholder="Select start date"
          />
        </div>
        <div>
          <Label htmlFor="endDate">End Date</Label>
          <DatePicker
            date={endDate}
            onDateChange={setEndDate}
            placeholder="Select end date"
          />
        </div>
        <SubmitButton
          disabled={loading}
          className="self-end"
          text={loading ? "Exporting..." : "Export Data"}
        />
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="self-end"
          asChild
        >
          <a href="/Stanford REACH Lab Data Dashboard Codebook_2025.xlsx" download>
            Download Codebook
          </a>
        </Button>
      </div>
    </FormContainer>
  );
};

export default AdminMetricsFilters;
