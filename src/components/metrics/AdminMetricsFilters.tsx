"use client";
import { Roles, UserLocation } from "@prisma/client";
import { useEffect, useState } from "react";
import FormContainer from "../form/FormContainer";
import {
  downloadData,
  downloadUsers,
  getDistribution,
  getPrePostDistribution,
} from "@/utils/actions";
import type {
  ComparisonResult,
  DistributionResult,
} from "@/utils/actions/distributionActions";
import DistributionCharts from "./DistributionCharts";
import ChartsInfoButton from "./ChartsInfoButton";
import { toast } from "sonner";
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
  const [loadingUsers, setLoadingUsers] = useState(false);
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

  const handleExportUsers = async () => {
    try {
      setLoadingUsers(true);
      await downloadUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

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

  // For roles with a fixed parent level, child options are never loaded by the
  // change effects (they guard with early returns). Load them once on mount.
  useEffect(() => {
    if (fixedState && !fixedCounty && location.state !== "All") {
      fetchLocations("county", { country: location.country, state: location.state }).then(setCounties);
    }
    if (fixedCounty && !fixedDistrict && location.county && location.county !== "All") {
      fetchLocations("district", { country: location.country, state: location.state, county: location.county }).then(setDistricts);
    }
    if (fixedDistrict && !fixedCityAndSchool && location.district && location.district !== "All") {
      fetchLocations("city", { country: location.country, state: location.state, county: location.county, district: location.district }).then(setCities);
    }
  }, []);

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
        const query = {
          country: location.country,
          state: location.state,
          county: location.county,
        };
        const [districts, cities] = await Promise.all([
          fetchLocations("district", query),
          fetchLocations("city", query),
        ]);
        setDistricts(districts);
        setCities(cities);
      }
    };

    updateDistricts();
  }, [location.county]);

  // District is optional (private schools, colleges), so cities come from the
  // county and are only narrowed by district when one is picked.
  useEffect(() => {
    if (fixedCityAndSchool) return;

    const updateCities = async () => {
      setLocation((prev) => ({ ...prev, city: "All", school: "All" }));
      setCities([]);
      setSchools([]);

      if (location.county && location.county !== "All") {
        const cityQuery: Record<string, string> = {
          country: location.country,
          state: location.state,
          county: location.county,
        };
        if (location.district && location.district !== "All") {
          cityQuery.district = location.district;
        }
        const cities = await fetchLocations("city", cityQuery);
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
          if (location.district !== "All") {
            schoolQuery.district = location.district;
          }
        }

        const schools = await fetchLocations("school", schoolQuery);
        setSchools(schools);
      }
    };

    updateSchools();
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
        <div className="flex items-end gap-1">
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="flex-1"
            disabled={loadingCharts}
            onClick={() => handleViewCharts()}
          >
            {loadingCharts ? "Loading Charts..." : "View Charts"}
          </Button>
          <ChartsInfoButton />
        </div>
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
        {role === Roles.stanford && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="self-end"
            disabled={loadingUsers}
            onClick={handleExportUsers}
          >
            {loadingUsers ? "Exporting..." : "Export Users"}
          </Button>
        )}
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

export default AdminMetricsFilters;
