import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const roleOptions = [
  {
    role: "teacher",
    label:
      "teacher/educator (e.g., counselor, prevention specialist, youth-serving professional)",
    international: true,
  },
  {
    role: "site",
    label: "site admin",
    international: true,
  },
  {
    role: "site-teacher",
    label: "site Admin (with teacher/educator code)",
    international: true,
  },
  {
    role: "district",
    label: "district admin",
    international: false,
  },
  {
    role: "district-teacher",
    label: "district admin (with teacher/educator code)",
    international: false,
  },
  {
    role: "county",
    label: "county admin",
    international: false,
  },
  {
    role: "county-teacher",
    label: "county admin (with teacher/educator code)",
    international: false,
  },
  {
    role: "state",
    label: "state admin",
    international: false,
  },
  {
    role: "state-teacher",
    label: "state admin (with teacher/educator code)",
    international: false,
  },
  {
    role: "country",
    label: "country admin",
    international: true,
  },
  {
    role: "stanford",
    label: "stanford admin",
    international: false,
  },
];

const SelectRole = ({ country }: { country: string }) => {
  return (
    <Select name="role" required>
      <SelectTrigger className="w-full mt-3 capitalize">
        <SelectValue placeholder="Select your role" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Role</SelectLabel>
          {roleOptions.map((role) => {
            if (country !== "UNITED STATES" && !role.international) {
              return;
            }

            return (
              <SelectItem
                value={role.role}
                key={role.role}
                className="capitalize"
              >
                {role.label}
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default SelectRole;
