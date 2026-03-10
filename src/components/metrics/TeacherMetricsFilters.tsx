"use client";
import { UserLocation } from "@prisma/client";
import { useState } from "react";
import FormContainer from "../form/FormContainer";
import LocationComboBox from "../selectCreateLocation/LocationComboBox";
import { Label } from "../ui/label";
import { downloadData } from "@/utils/actions";
import { SubmitButton } from "../form/Buttons";
import { Button } from "../ui/button";
import { useEffect } from "react";
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

const TeacherMetricsFilters = ({
  role,
  userId,
  teacherLocations,
  forms,
  firstResponseDate,
}: {
  role: string;
  userId: string;
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
      const districts = teacherLocations
        .filter(
          (t) =>
            t.country === location.country &&
            t.state === location.state &&
            t.county === location.county
        )
        .map((t) => t.district)
        .filter((district): district is string => district !== null);
      setDistricts([...new Set(districts)]);
    }
  }, [location.county]);

  useEffect(() => {
    if (oneLocation) return;

    setLocation((prev) => ({ ...prev, city: "All", school: "All" }));
    setCities([]);
    setSchools([]);

    if (location.district !== "All") {
      const cities = teacherLocations
        .filter(
          (t) =>
            t.country === location.country &&
            t.state === location.state &&
            t.county === location.county &&
            t.district === location.district
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
              t.district === location.district &&
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

export default TeacherMetricsFilters;
