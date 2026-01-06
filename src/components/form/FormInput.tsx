import { Label } from "../ui/label";
import { Input } from "../ui/input";

type FormInputProps = {
  name: string;
  type: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
};

function FormInput({
  name,
  type,
  label,
  defaultValue,
  placeholder,
  disabled = false,
  required = true,
}: FormInputProps) {
  return (
    <div className="mb-3">
      <Label htmlFor={name} className="capitalize">
        {label || name}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
      />
    </div>
  );
}
export default FormInput;
