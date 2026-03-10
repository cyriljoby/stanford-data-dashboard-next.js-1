"use client";
import { Roles, UserLocation } from "@prisma/client";
import { useEffect, useState } from "react";
import FormContainer from "../form/FormContainer";
import { downloadData, downloadUsers } from "@/utils/actions";
import LocationComboBox from "../selectCreateLocation/LocationComboBox";
import countries from "@/data/countries";
import states from "@/data/states";
import { fetchLocations } from "@/utils/helpers";
import { Label } from "../ui/label";
import { SubmitButton } from "../form/Buttons";
import { Button } from "../ui/button";
import { DatePicker } from "../ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Skeleton } from "../ui/skeleton";
import PrePostChart from "./PrePostChart";
import type { ChartDataResponse } from "@/utils/types";

const AdminMetricsFilters = ({
  role,
  userId,
  adminLocation,
  forms,
  firstResponseDate,
}: {
  role: Roles;
  userId: string;
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
  const [startDate, setStartDate] = useState<Date | undefined>(firstResponseDate);
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  // Chart state
  const [selectedForm, setSelectedForm] = useState("All");
  const [chartData, setChartData] = useState<ChartDataResponse | null>(null);
  const [loadingChart, setLoadingChart] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  const handleExport = async (prevState: any, formData: FormData) => {
    try {
      setLoading(true);
      const paramsObj: Record<string, string> = {};

      console.log("FORM DATA ENTRIES:");
      for (const [key, value] of formData.entries()) {
        console.log(key, value);
        if (value && value !== "All") paramsObj[key] = String(value);
      }

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

  const handleViewCharts = async () => {
    setLoadingChart(true);
    setChartError(null);
    setChartData(null);
    try {
      const params = new URLSearchParams({ form: selectedForm, role, userId });
      if (location.country && location.country !== "All")
        params.append("country", location.country);
      if (location.state && location.state !== "All")
        params.append("state", location.state);
      if (location.county && location.county !== "All")
        params.append("county", location.county);
      if (location.district && location.district !== "All")
        params.append("district", location.district);
      if (location.city && location.city !== "All")
        params.append("city", location.city);
      if (location.school && location.school !== "All")
        params.append("school", location.school);
      if (startDate) params.append("startDate", startDate.toISOString().split("T")[0]);
      if (endDate) params.append("endDate", endDate.toISOString().split("T")[0]);

      const res = await fetch(`/api/chartData?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to load chart data");
      }
      setChartData(await res.json());
    } catch (e) {
      setChartError(e instanceof Error ? e.message : "Failed to load chart data");
    } finally {
      setLoadingChart(false);
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
          {/* Hidden input so handleExport (FormData) still reads the form value */}
          <input type="hidden" name="form" value={selectedForm} />
          <Select
            value={selectedForm}
            onValueChange={(v) => {
              setSelectedForm(v);
              setChartData(null);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a form" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {forms.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          disabled={loadingChart || selectedForm === "All"}
          title={
            selectedForm === "All"
              ? "Select a specific form to view charts"
              : undefined
          }
          onClick={handleViewCharts}
        >
          {loadingChart ? "Loading..." : "View Charts"}
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

      {chartError && (
        <p className="mt-4 text-sm text-destructive">{chartError}</p>
      )}
      {loadingChart && <Skeleton className="mt-6 h-[420px] w-full" />}
      {chartData && !loadingChart && (
        <PrePostChart data={chartData} formName={selectedForm} />
      )}
    </FormContainer>
  );
};

export default AdminMetricsFilters;
