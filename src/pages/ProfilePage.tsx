import { useState, useRef } from "react";
import { useAuth } from "../app/contexts/AuthContext";
import { profileApi } from "../services/api";

/* ================= COUNTRY CODES (inline) ================= */

interface CountryCode {
  name: string;
  iso: string;
  dialCode: string;
  maxLength: number; // expected digits for local number (without dial code)
}

const countryCodes: CountryCode[] = [
  { name: "India", iso: "IN", dialCode: "+91", maxLength: 10 },
  { name: "United States", iso: "US", dialCode: "+1", maxLength: 10 },
  { name: "United Kingdom", iso: "GB", dialCode: "+44", maxLength: 10 },
  { name: "Canada", iso: "CA", dialCode: "+1", maxLength: 10 },
  { name: "Australia", iso: "AU", dialCode: "+61", maxLength: 9 },
  { name: "Germany", iso: "DE", dialCode: "+49", maxLength: 11 },
  { name: "France", iso: "FR", dialCode: "+33", maxLength: 9 },
  { name: "Italy", iso: "IT", dialCode: "+39", maxLength: 10 },
  { name: "Spain", iso: "ES", dialCode: "+34", maxLength: 9 },
  { name: "Netherlands", iso: "NL", dialCode: "+31", maxLength: 9 },
  { name: "Belgium", iso: "BE", dialCode: "+32", maxLength: 9 },
  { name: "Switzerland", iso: "CH", dialCode: "+41", maxLength: 9 },
  { name: "Austria", iso: "AT", dialCode: "+43", maxLength: 10 },
  { name: "Sweden", iso: "SE", dialCode: "+46", maxLength: 9 },
  { name: "Norway", iso: "NO", dialCode: "+47", maxLength: 8 },
  { name: "Denmark", iso: "DK", dialCode: "+45", maxLength: 8 },
  { name: "Finland", iso: "FI", dialCode: "+358", maxLength: 9 },
  { name: "Poland", iso: "PL", dialCode: "+48", maxLength: 9 },
  { name: "Portugal", iso: "PT", dialCode: "+351", maxLength: 9 },
  { name: "Greece", iso: "GR", dialCode: "+30", maxLength: 10 },
  { name: "Ireland", iso: "IE", dialCode: "+353", maxLength: 9 },
  { name: "Russia", iso: "RU", dialCode: "+7", maxLength: 10 },
  { name: "Ukraine", iso: "UA", dialCode: "+380", maxLength: 9 },
  { name: "Turkey", iso: "TR", dialCode: "+90", maxLength: 10 },
  { name: "China", iso: "CN", dialCode: "+86", maxLength: 11 },
  { name: "Japan", iso: "JP", dialCode: "+81", maxLength: 10 },
  { name: "South Korea", iso: "KR", dialCode: "+82", maxLength: 10 },
  { name: "Singapore", iso: "SG", dialCode: "+65", maxLength: 8 },
  { name: "Malaysia", iso: "MY", dialCode: "+60", maxLength: 9 },
  { name: "Indonesia", iso: "ID", dialCode: "+62", maxLength: 11 },
  { name: "Thailand", iso: "TH", dialCode: "+66", maxLength: 9 },
  { name: "Vietnam", iso: "VN", dialCode: "+84", maxLength: 9 },
  { name: "Philippines", iso: "PH", dialCode: "+63", maxLength: 10 },
  { name: "Pakistan", iso: "PK", dialCode: "+92", maxLength: 10 },
  { name: "Bangladesh", iso: "BD", dialCode: "+880", maxLength: 10 },
  { name: "Sri Lanka", iso: "LK", dialCode: "+94", maxLength: 9 },
  { name: "Nepal", iso: "NP", dialCode: "+977", maxLength: 10 },
  { name: "United Arab Emirates", iso: "AE", dialCode: "+971", maxLength: 9 },
  { name: "Saudi Arabia", iso: "SA", dialCode: "+966", maxLength: 9 },
  { name: "Qatar", iso: "QA", dialCode: "+974", maxLength: 8 },
  { name: "Kuwait", iso: "KW", dialCode: "+965", maxLength: 8 },
  { name: "Oman", iso: "OM", dialCode: "+968", maxLength: 8 },
  { name: "Bahrain", iso: "BH", dialCode: "+973", maxLength: 8 },
  { name: "Israel", iso: "IL", dialCode: "+972", maxLength: 9 },
  { name: "Egypt", iso: "EG", dialCode: "+20", maxLength: 10 },
  { name: "South Africa", iso: "ZA", dialCode: "+27", maxLength: 9 },
  { name: "Nigeria", iso: "NG", dialCode: "+234", maxLength: 10 },
  { name: "Kenya", iso: "KE", dialCode: "+254", maxLength: 9 },
  { name: "Brazil", iso: "BR", dialCode: "+55", maxLength: 11 },
  { name: "Mexico", iso: "MX", dialCode: "+52", maxLength: 10 },
  { name: "Argentina", iso: "AR", dialCode: "+54", maxLength: 10 },
  { name: "Chile", iso: "CL", dialCode: "+56", maxLength: 9 },
  { name: "Colombia", iso: "CO", dialCode: "+57", maxLength: 10 },
  { name: "Peru", iso: "PE", dialCode: "+51", maxLength: 9 },
  { name: "New Zealand", iso: "NZ", dialCode: "+64", maxLength: 9 },
  { name: "Hong Kong", iso: "HK", dialCode: "+852", maxLength: 8 },
  { name: "Taiwan", iso: "TW", dialCode: "+886", maxLength: 9 },
];

const getCountryByDialCode = (dialCode: string): CountryCode =>
  countryCodes.find((c) => c.dialCode === dialCode) || countryCodes[0];

export default function ProfilePage() {
  const { currentUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const [form, setForm] = useState({
    firstName:       currentUser?.name.split(" ")[0] || "",
    lastName:        currentUser?.name.split(" ")[1] || "",
    email:           currentUser?.email || "",
    countryCode:     (currentUser as any)?.countryCode || "+91",
    phone:           currentUser?.phone || "",
    designation:     "Software Engineer",
    department:      currentUser?.department || "Engineering",
    dob:             "",
    gender:          "",
    address:         "",
    country:         "",
    state:           "",
    city:            "",
    postalCode:      "",
    currentPassword: "",
    newPassword:     "",
    confirmPassword: "",
  });

  if (!currentUser) return null;

  const selectedCountry = getCountryByDialCode(form.countryCode);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ✅ digits only, capped to the selected country's expected length
  const handlePhoneChange = (e: any) => {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    const trimmed = digitsOnly.slice(0, selectedCountry.maxLength);
    setForm({ ...form, phone: trimmed });

    if (trimmed.length > 0 && trimmed.length !== selectedCountry.maxLength) {
      setPhoneError(
        `${selectedCountry.name} phone number must be exactly ${selectedCountry.maxLength} digits.`
      );
    } else {
      setPhoneError("");
    }
  };

  // ✅ re-validate phone length whenever country code changes
  const handleCountryCodeChange = (e: any) => {
    const dialCode = e.target.value;
    const newCountry = getCountryByDialCode(dialCode);
    setForm({ ...form, countryCode: dialCode });

    if (form.phone.length > 0 && form.phone.length !== newCountry.maxLength) {
      setPhoneError(
        `${newCountry.name} phone number must be exactly ${newCountry.maxLength} digits.`
      );
    } else {
      setPhoneError("");
    }
  };

  const handlePostalCodeChange = (e: any) => {
    setForm({ ...form, postalCode: e.target.value.replace(/\D/g, "") });
  };

  const handleImage = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setMessage("");

    // ✅ validate phone before saving
    if (form.phone.length !== selectedCountry.maxLength) {
      setPhoneError(
        `${selectedCountry.name} phone number must be exactly ${selectedCountry.maxLength} digits.`
      );
      return;
    }

    setSaving(true);

    try {
      await profileApi.update({
        name: `${form.firstName} ${form.lastName}`.trim(),
        phone: form.phone,
        countryCode: form.countryCode,
        department: form.department,
        avatar: avatar || undefined,
      });

      setMessage("✅ Profile updated successfully!");
    } catch (err: any) {
      setMessage("❌ " + (err.message || "Failed to update profile"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      ...form,
      firstName: currentUser.name.split(" ")[0] || "",
      lastName:  currentUser.name.split(" ")[1] || "",
      email:     currentUser.email,
      phone:     currentUser.phone || "",
      countryCode: (currentUser as any)?.countryCode || "+91",
    });
    setAvatar(null);
    setMessage("");
    setPhoneError("");
  };

  return (
    <div className="w-full bg-white p-8 rounded-xl shadow space-y-8">

      <h2 className="text-2xl font-semibold">Profile Settings</h2>

      {message && (
        <div className={`p-3 rounded-lg text-sm text-center ${
          message.startsWith("✅")
            ? "bg-green-50 text-green-600 border border-green-200"
            : "bg-red-50 text-red-600 border border-red-200"
        }`}>
          {message}
        </div>
      )}

      {/* PHOTO */}
      <div className="flex items-center gap-6">
        <div className="h-20 w-20 rounded-full overflow-hidden bg-orange-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-orange-200">
          {avatar ? (
            <img src={avatar} className="h-full w-full object-cover" />
          ) : currentUser.avatar ? (
            <img src={currentUser.avatar} className="h-full w-full object-cover" />
          ) : (
            currentUser.name.charAt(0).toUpperCase()
          )}
        </div>

        <div>
          <button
            onClick={() => fileRef.current?.click()}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm transition"
          >
            Upload Photo
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
          <p className="text-xs text-gray-400 mt-1">Recommended: 200x200 JPG or PNG</p>
        </div>
      </div>

      {/* BASIC INFO */}
      <Section title="Basic Information">
        <Field label="First Name"   name="firstName"   value={form.firstName}   onChange={handleChange} />
        <Field label="Last Name"    name="lastName"    value={form.lastName}    onChange={handleChange} />
        <Field label="Email"        name="email"       value={form.email}       onChange={handleChange} disabled />

        {/* ✅ PHONE FIELD WITH COUNTRY CODE DROPDOWN */}
        <div>
          <label className="text-sm text-gray-500 font-medium">Phone</label>
          <div className="mt-1 flex gap-2">
            <select
              name="countryCode"
              value={form.countryCode}
              onChange={handleCountryCodeChange}
              className="border rounded-lg px-2 py-2 w-28 focus:ring-2 focus:ring-orange-400 outline-none bg-white"
            >
              {countryCodes.map((c) => (
                <option key={`${c.iso}-${c.dialCode}`} value={c.dialCode}>
                  {c.dialCode} {c.iso}
                </option>
              ))}
            </select>

            <input
              name="phone"
              value={form.phone}
              onChange={handlePhoneChange}
              inputMode="numeric"
              maxLength={selectedCountry.maxLength}
              placeholder={`${selectedCountry.maxLength} digit number`}
              className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400 outline-none"
            />
          </div>
          {phoneError && (
            <p className="text-xs text-red-500 mt-1">{phoneError}</p>
          )}
        </div>

        <Field label="Designation"  name="designation" value={form.designation} onChange={handleChange} />
        <Field label="Department"   name="department"  value={form.department}  onChange={handleChange} />
        <Field label="Date of Birth" name="dob"        value={form.dob}         onChange={handleChange} type="date" />
        <SelectField
          label="Gender"
          name="gender"
          value={form.gender}
          onChange={handleChange}
          options={["Male", "Female", "Other"]}
        />
      </Section>

      {/* ADDRESS */}
      <Section title="Address Information">
        <Field label="Address"     name="address"    value={form.address}    onChange={handleChange} />
        <Field label="Country"     name="country"    value={form.country}    onChange={handleChange} />
        <Field label="State"       name="state"      value={form.state}      onChange={handleChange} />
        <Field label="City"        name="city"       value={form.city}       onChange={handleChange} />
        <Field label="Postal Code" name="postalCode" value={form.postalCode} onChange={handlePostalCodeChange} />
      </Section>

      {/* ACTIONS */}
      <div className="flex justify-end gap-3 border-t pt-6">
        <button
          onClick={handleCancel}
          className="px-5 py-2 rounded-lg border hover:bg-gray-100 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:bg-orange-300 transition font-medium"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b">{title}</h3>
      <div className="grid md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Field({ label, ...props }: any) {
  return (
    <div>
      <label className="text-sm text-gray-500 font-medium">{label}</label>
      <input
        {...props}
        className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400 outline-none disabled:bg-gray-50 disabled:text-gray-400"
      />
    </div>
  );
}

function SelectField({ label, options, ...props }: any) {
  return (
    <div>
      <label className="text-sm text-gray-500 font-medium">{label}</label>
      <select
        {...props}
        className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400 outline-none bg-white"
      >
        <option value="">Select</option>
        {options.map((o: string) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}
