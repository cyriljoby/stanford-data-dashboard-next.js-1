"use client";
import { UserLocation } from "@prisma/client";
import { useState } from "react";
import FormContainer from "../form/FormContainer";
import LocationComboBox from "../selectCreateLocation/LocationComboBox";
import { Label } from "../ui/label";
import SelectInput from "../form/SelectInput";
import {
  downloadData,
  getDistribution,
  getPrePostDistribution,
} from "@/utils/actions";
import type {
  ComparisonResult,
  DistributionResult,
} from "@/utils/actions/distributionActions";
import DistributionCharts from "./DistributionCharts";
import { toast } from "sonner";
import { SubmitButton } from "../form/Buttons";
import { Button } from "../ui/button";
import { useEffect } from "react";
import { DatePicker } from "../ui/date-picker";

const TeacherMetricsFilters = ({
  teacherLocations,
  forms,
  firstResponseDate,
}: {
  teacherLocations: UserLocation[];
  forms: string[];
  firstResponseDate?: Date;
}) => {
  const [location, setLocation] = useState({
    country: "All",
    state: "All",
    county: "All",
    district: "All",
    city: "All",
    school: "All",
  });
  const [loading, setLoading] = useState(false);
  const [selectedForm, setSelectedForm] = useState("All");
  const [surveyType, setSurveyType] = useState<"pre" | "post" | "compare">(
    "pre"
  );
  const [chartVersion, setChartVersion] = useState<string | undefined>(
    undefined
  );
  const [charts, setCharts] = useState<
    DistributionResult | ComparisonResult | null
  >(null);
  const [loadingCharts, setLoadingCharts] = useState(false);
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

  // Scoping happens server-side; these filters only narrow within it.
  const handleViewCharts = async (
    type: "pre" | "post" | "compare" = surveyType,
    version: string | undefined = chartVersion
  ) => {
    if (selectedForm === "All") {
      toast.error("Select a specific form to view charts");
      return;
    }
    try {
      setLoadingCharts(true);
      const baseFilters = {
        form: selectedForm,
        version,
        country: location.country,
        state: location.state,
        county: location.county,
        district: location.district,
        city: location.city,
        school: location.school,
        startDate: startDate?.toISOString().split("T")[0],
        endDate: endDate?.toISOString().split("T")[0],
      };
      const result =
        type === "compare"
          ? await getPrePostDistribution(baseFilters)
          : await getDistribution({ ...baseFilters, type });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setCharts(result);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load charts");
    } finally {
      setLoadingCharts(false);
    }
  };

  const handleSurveyTypeChange = (type: string) => {
    const newType =
      type === "post" ? "post" : type === "compare" ? "compare" : "pre";
    setSurveyType(newType);
    if (charts) handleViewCharts(newType);
  };

  const handleVersionChange = (version: string) => {
    setChartVersion(version);
    if (charts) handleViewCharts(surveyType, version);
  };

  const onlyUnitedStates = teacherLocations.every(
    (location) => location.country === "UNITED STATES"
  );
  const oneLocation = teacherLocations.length === 1;
  useEffect(() => {
    if (oneLocation) {
      const singleLocation: {
        country: string;
        state: string;
        county: string;
        district: string;
        city: string;
        school: string;
      } = {
        country: teacherLocations[0].country,
        state: "All",
        county: "All",
        district: "All",
        city: teacherLocations[0].city as string,
        school: teacherLocations[0].school as string,
      };

      if (onlyUnitedStates) {
        singleLocation.state = teacherLocations[0].state as string;
        singleLocation.county = teacherLocations[0].county as string;
        singleLocation.district = teacherLocations[0].district as string;
      }

      setLocation(singleLocation);
    }

    if (onlyUnitedStates) {
      setLocation((prev) => ({
        ...prev,
        country: "UNITED STATES",
      }));
    }
  }, [teacherLocations]);

  const isUSA = location.country === "UNITED STATES";
  const countries = [
    ...new Set(teacherLocations.map((location) => location.country)),
  ];
  const states = [
    ...new Set(
      teacherLocations
        .filter((t) => t.country === "UNITED STATES")
        .map((t) => t.state)
        .filter((state): state is string => state !== null)
    ),
  ];
  const [counties, setCounties] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [schools, setSchools] = useState<string[]>([]);

  useEffect(() => {
    if (onlyUnitedStates || oneLocation) return;

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
      const cities = teacherLocations
        .filter((t) => t.country === location.country)
        .map((t) => t.city)
        .filter((city): city is string => city !== null);
      setCities(cities);
    }
  }, [location.country]);

  useEffect(() => {
    if (oneLocation) return;

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
      const counties = teacherLocations
        .filter(
          (t) => t.country === location.country && t.state === location.state
        )
        .map((t) => t.county)
        .filter((county): county is string => county !== null);
      setCounties([...new Set(counties)]);
    }
  }, [location.state]);

  useEffect(() => {
    if (oneLocation) return;

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
      const inCounty = teacherLocations.filter(
        (t) =>
          t.country === location.country &&
          t.state === location.state &&
          t.county === location.county
      );
      const districts = inCounty
        .map((t) => t.district)
        .filter((district): district is string => !!district);
      setDistricts([...new Set(districts)]);
      const cities = inCounty
        .map((t) => t.city)
        .filter((city): city is string => city !== null);
      setCities([...new Set(cities)]);
    }
  }, [location.county]);

  // District is optional (private schools, colleges), so cities come from the
  // county and are only narrowed by district when one is picked.
  useEffect(() => {
    if (oneLocation) return;

    setLocation((prev) => ({ ...prev, city: "All", school: "All" }));
    setCities([]);
    setSchools([]);

    if (location.county !== "All") {
      const cities = teacherLocations
        .filter(
          (t) =>
            t.country === location.country &&
            t.state === location.state &&
            t.county === location.county &&
            (location.district === "All" || t.district === location.district)
        )
        .map((t) => t.city)
        .filter((city): city is string => city !== null);
      setCities([...new Set(cities)]);
    }
  }, [location.district]);

  useEffect(() => {
    if (oneLocation) return;

    setLocation((prev) => ({ ...prev, school: "All" }));
    setSchools([]);

    if (location.city !== "All") {
      const schools = teacherLocations
        .filter((t) => {
          if (isUSA) {
            return (
              t.country === location.country &&
              t.state === location.state &&
              t.county === location.county &&
              (location.district === "All" ||
                t.district === location.district) &&
              t.city === location.city
            );
          } else {
            return t.country === location.country && t.city === location.city;
          }
        })
        .map((t) => t.school)
        .filter((school): school is string => school !== null);

      setSchools(schools);
    }
  }, [location.city]);

  return (
    <>
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
              oneLocation || onlyUnitedStates
                ? [location.country]
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
                options={oneLocation ? [location.state] : ["All", ...states]}
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
                options={oneLocation ? [location.county] : ["All", ...counties]}
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
                  oneLocation ? [location.district] : ["All", ...districts]
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
            options={oneLocation ? [location.city] : ["All", ...cities]}
            marginBottom={0}
          />
        </div>
        <div>
          <Label>School</Label>
          <LocationComboBox
            name="school"
            value={location.school}
            onChange={(school) => setLocation((prev) => ({ ...prev, school }))}
            options={oneLocation ? [location.school] : ["All", ...schools]}
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
            onValueChange={(form) => {
              setSelectedForm(form);
              setChartVersion(undefined);
              setCharts(null);
            }}
          />
        </div>
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <DatePicker
            date={startDate}
            onDateChange={setStartDate}
            placeholder="Select start date"
            fromDate={new Date("2023-08-08")}
            toDate={new Date()}
          />
        </div>
        <div>
          <Label htmlFor="endDate">End Date</Label>
          <DatePicker
            date={endDate}
            onDateChange={setEndDate}
            placeholder="Select end date"
            fromDate={new Date("2023-08-08")}
            toDate={new Date()}
          />
        </div>
        <SubmitButton
          disabled={loading}
          className="self-end"
          text={loading ? "Exporting..." : "Export Data"}
        />
        <Button
          type="button"
          size="lg"
          variant="secondary"
          className="self-end"
          disabled={loadingCharts}
          onClick={() => handleViewCharts()}
        >
          {loadingCharts ? "Loading Charts..." : "View Charts"}
        </Button>
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
      {charts && (
        <div className="mt-2 border-t pt-4">
          <div className="mb-2 flex flex-wrap gap-4">
            <div className="w-full max-w-[12rem]">
              <Label>Survey Type</Label>
              <SelectInput
                name="chartSurveyType"
                placeholder="Survey type"
                options={[
                  { text: "Pre-survey", value: "pre" },
                  { text: "Post-survey", value: "post" },
                  { text: "Pre vs Post", value: "compare" },
                ]}
                defaultValue={surveyType}
                withMargin={false}
                onValueChange={handleSurveyTypeChange}
              />
            </div>
            {charts.versions.length > 1 && (
              <div className="w-full max-w-[12rem]">
                <Label>Form Version</Label>
                <SelectInput
                  key={selectedForm}
                  name="chartFormVersion"
                  placeholder="Form version"
                  options={charts.versions.map((v) => ({
                    text: v.label,
                    value: v.title,
                  }))}
                  defaultValue={charts.selectedVersion}
                  withMargin={false}
                  onValueChange={handleVersionChange}
                />
              </div>
            )}
          </div>
          <DistributionCharts
            key={`${charts.formTitle}-${charts.mode === "single" ? charts.type : "compare"}`}
            data={charts}
          />
        </div>
      )}
    </>
  );
};

export default TeacherMetricsFilters;
