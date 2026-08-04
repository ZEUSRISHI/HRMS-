import { useEffect, useRef, useState } from "react";
import { Camera, Download, Info, Pencil, X, Check, Loader2, Trash2, Upload, FileText } from "lucide-react";
import { useAuth } from "../app/contexts/AuthContext";
import { profileApi } from "../services/api";

/* ============================================================
   TYPES
   ============================================================ */
interface ProfileData {
  name: string;
  preferredName: string;
  email: string;
  dob: string;
  gender: string;
  bloodGroup: string;
  phone: string;
  countryCode: string;
  address: string;
  maritalStatus: string;
  nationality: string;
  languagesKnown: string;

  employeeCode: string;
  department: string;
  employmentType: string;
  workMode: string;
  reportingManager: string;
  joiningDate: string;
  workLocation: string;
  isActive: boolean;
  designation: string;
  avatar: string;

  emergencyContact: string;
  emergencyCountryCode: string;
  emergencyContactName: string;
  emergencyRelationship: string;

  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: string;

  panNumber: string;
  uanNumber: string;
  pfNumber: string;
  taxRegime: string;
}
interface DocumentItem {
  _id: string;
  name: string;
  category: "employee" | "identity" | "tax";
  fileData: string;
  fileType: string;
  uploadedAt: string;
}

const emptyProfile: ProfileData = {
  name: "", preferredName: "", email: "", dob: "", gender: "", bloodGroup: "",
  phone: "", countryCode: "+91", address: "", maritalStatus: "", nationality: "",
  languagesKnown: "", employeeCode: "", department: "", employmentType: "Full-time",
  workMode: "", reportingManager: "", joiningDate: "", workLocation: "",
  isActive: true, designation: "", avatar: "",
  emergencyContact: "", emergencyCountryCode: "+91",
  emergencyContactName: "", emergencyRelationship: "",
  bankName: "", accountNumber: "", ifscCode: "", accountType: "",
  panNumber: "", uanNumber: "", pfNumber: "", taxRegime: "New Regime",
};

/* ============================================================
   MAIN PAGE
   ============================================================ */
export default function ProfilePage() {
  const { currentUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile]     = useState<ProfileData>(emptyProfile);
  const [draft, setDraft]         = useState<ProfileData>(emptyProfile);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError]         = useState("");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [uploadingCat, setUploadingCat] = useState<string | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const pendingCategoryRef = useRef<"employee" | "identity" | "tax">("employee");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await profileApi.get();
      const merged = { ...emptyProfile, ...res.user };
      setProfile(merged);
      setDraft(merged);
      setDocuments(res.user.documents || []);
    } catch (err) {
      console.error("Failed to load profile:", err);
      setError("Could not load profile. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  const openDocPicker = (category: "employee" | "identity" | "tax") => {
    pendingCategoryRef.current = category;
    docInputRef.current?.click();
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const category = pendingCategoryRef.current;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setUploadingCat(category);
        const res = await profileApi.uploadDocument({
          name: file.name,
          category,
          fileData: reader.result as string,
          fileType: file.type,
        });
        setDocuments(res.documents);
      } catch (err: any) {
        setError(err?.message || "Failed to upload document.");
      } finally {
        setUploadingCat(null);
        if (docInputRef.current) docInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDocDelete = async (docId: string) => {
    try {
      const res = await profileApi.deleteDocument(docId);
      setDocuments(res.documents);
    } catch (err: any) {
      setError(err?.message || "Failed to delete document.");
    }
  };

  const handleDocPreview = (doc: DocumentItem) => {
    const win = window.open();
    if (win) win.document.write(`<iframe src="${doc.fileData}" style="width:100%;height:100%;border:none;"></iframe>`);
  };

  const handleEditClick = () => {
    setDraft(profile);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(profile);
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      const res = await profileApi.update(draft);
      const merged = { ...emptyProfile, ...res.user };
      setProfile(merged);
      setDraft(merged);
      setIsEditing(false);
    } catch (err: any) {
      console.error("Failed to save profile:", err);
      setError(err?.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof ProfileData, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update("avatar", reader.result as string);
    reader.readAsDataURL(file);
  };

  if (!currentUser) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-orange-500" size={28} />
      </div>
    );
  }

  const data = isEditing ? draft : profile;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* ===================== HEADER CARD ===================== */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">

          {/* Avatar block */}
          <div className="relative w-40 h-40 rounded-xl overflow-hidden bg-gradient-to-br from-amber-300 to-orange-400 flex-shrink-0">
            {data.avatar ? (
              <img src={data.avatar} alt={data.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-semibold text-white">
                {data.name?.charAt(0) || "?"}
              </div>
            )}
            {isEditing && (
              <>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow hover:bg-white"
                  title="Change photo"
                >
                  <Camera size={16} className="text-gray-700" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
              </>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
              <p className="text-white font-medium text-sm leading-tight">{data.name || "—"}</p>
              <p className="text-white/80 text-xs">{data.designation || "—"}</p>
            </div>
          </div>

          {/* Employment meta grid */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4">
            <MetaField label="Employee Code" value={data.employeeCode} editing={isEditing} onChange={(v) => update("employeeCode", v)} />
            <MetaField label="Department" value={data.department} editing={isEditing} onChange={(v) => update("department", v)} />
            <MetaField label="Employment Type" value={data.employmentType} editing={isEditing} onChange={(v) => update("employmentType", v)} />

            <MetaField label="Work Mode" value={data.workMode} editing={isEditing} onChange={(v) => update("workMode", v)} />
            <MetaField label="Reporting Manager" value={data.reportingManager} editing={isEditing} onChange={(v) => update("reportingManager", v)} />
            <MetaField label="Joining Date" value={data.joiningDate} editing={isEditing} onChange={(v) => update("joiningDate", v)} />

            <MetaField label="Work Location" value={data.workLocation} editing={isEditing} onChange={(v) => update("workLocation", v)} />
            <div>
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <p className={`text-sm font-semibold ${data.isActive ? "text-emerald-600" : "text-gray-400"}`}>
                {data.isActive ? "Active" : "Inactive"}
              </p>
            </div>
          </div>

          {/* Edit toggle */}
          <div className="flex-shrink-0">
            {!isEditing ? (
              <button
                onClick={handleEditClick}
                className="flex items-center gap-2 bg-orange-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-orange-600 transition"
              >
                <Pencil size={14} /> Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex items-center gap-2 border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  <X size={14} /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-orange-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===================== PERSONAL INFORMATION ===================== */}
      <SectionCard
        title="Personal Information"
        subtitle="Your personal details and contact information"
        editing={isEditing}
      >
        <FieldGrid>
          <Field label="Full Name" value={data.name} editing={isEditing}
                 onChange={(v) => update("name", v)} />
          <Field label="Preferred Name" value={data.preferredName} editing={isEditing}
                 onChange={(v) => update("preferredName", v)} />
          <Field label="Date of Birth" value={data.dob} editing={isEditing} type="date"
                 onChange={(v) => update("dob", v)} />

          <SelectField label="Gender" value={data.gender} editing={isEditing}
                 options={["male", "female", "other"]}
                 onChange={(v) => update("gender", v)} />
          <Field label="Blood Group" value={data.bloodGroup} editing={isEditing}
                 onChange={(v) => update("bloodGroup", v)} />
          <Field label="Mobile Number" value={data.phone} editing={isEditing}
                 onChange={(v) => update("phone", v)} />

          <Field label="Personal Email" value={data.email} editing={false}
                 onChange={() => {}} />
          <Field label="Current Address" value={data.address} editing={isEditing}
                 onChange={(v) => update("address", v)} className="sm:col-span-2" />
          <SelectField label="Marital Status" value={data.maritalStatus} editing={isEditing}
                 options={["Single", "Married", "Other"]}
                 onChange={(v) => update("maritalStatus", v)} />

          <Field label="Nationality" value={data.nationality} editing={isEditing}
                 onChange={(v) => update("nationality", v)} />
          <Field label="Languages Known" value={data.languagesKnown} editing={isEditing}
                 onChange={(v) => update("languagesKnown", v)} />
        </FieldGrid>
      </SectionCard>

      {/* ===================== EMERGENCY CONTACT ===================== */}
      <SectionCard title="Emergency Contact" editing={isEditing}>
        <FieldGrid>
          <Field label="Contact Name" value={data.emergencyContactName} editing={isEditing}
                 onChange={(v) => update("emergencyContactName", v)} />
          <Field label="Relationship" value={data.emergencyRelationship} editing={isEditing}
                 onChange={(v) => update("emergencyRelationship", v)} />
          <Field label="Phone Number" value={data.emergencyContact} editing={isEditing}
                 onChange={(v) => update("emergencyContact", v)} />
        </FieldGrid>
      </SectionCard>

      {/* ===================== BANK DETAILS ===================== */}
      <SectionCard title="Bank Details" editing={isEditing}>
        <FieldGrid>
          <Field label="Bank Name" value={data.bankName} editing={isEditing}
                 onChange={(v) => update("bankName", v)} />
          <Field
            label="Account Number"
            value={
              isEditing
                ? data.accountNumber
                : data.accountNumber
                  ? "•".repeat(Math.max(0, data.accountNumber.length - 4)) + data.accountNumber.slice(-4)
                  : ""
            }
            editing={isEditing}
            onChange={(v) => update("accountNumber", v)}
          />
          <Field label="IFSC Code" value={data.ifscCode} editing={isEditing}
                 onChange={(v) => update("ifscCode", v)} />
          <Field label="Account Type" value={data.accountType} editing={isEditing}
                 onChange={(v) => update("accountType", v)} />
        </FieldGrid>
      </SectionCard>

      {/* ===================== TAX INFORMATION ===================== */}
      <SectionCard title="Tax Information" editing={isEditing}>
        <FieldGrid>
          <Field label="PAN Number" value={data.panNumber} editing={isEditing}
                 onChange={(v) => update("panNumber", v)} />
          <Field label="UAN Number" value={data.uanNumber} editing={isEditing}
                 onChange={(v) => update("uanNumber", v)} />
          <Field label="PF Number" value={data.pfNumber} editing={isEditing}
                 onChange={(v) => update("pfNumber", v)} />
          <SelectField label="Tax Regime" value={data.taxRegime} editing={isEditing}
                 options={["New Regime", "Old Regime"]}
                 onChange={(v) => update("taxRegime", v)} />
        </FieldGrid>

        <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
          <Info size={16} className="mt-0.5 flex-shrink-0" />
          All financial data is encrypted and secure
        </div>
      </SectionCard>

      {/* ===================== DOCUMENT CENTER ===================== */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900">Document Center</h2>
        <p className="text-sm text-gray-500 mt-0.5 mb-5">Manage and upload your employment documents</p>

        <input ref={docInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleDocUpload} className="hidden" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <DocColumn
            title="Employee Documents" color="blue" category="employee"
            documents={documents.filter((d) => d.category === "employee")}
            uploading={uploadingCat === "employee"}
            onAdd={() => openDocPicker("employee")}
            onPreview={handleDocPreview}
            onDelete={handleDocDelete}
          />
          <DocColumn
            title="Identity Documents" color="pink" category="identity"
            documents={documents.filter((d) => d.category === "identity")}
            uploading={uploadingCat === "identity"}
            onAdd={() => openDocPicker("identity")}
            onPreview={handleDocPreview}
            onDelete={handleDocDelete}
          />
          <DocColumn
            title="Tax & Finance" color="amber" category="tax"
            documents={documents.filter((d) => d.category === "tax")}
            uploading={uploadingCat === "tax"}
            onAdd={() => openDocPicker("tax")}
            onPreview={handleDocPreview}
            onDelete={handleDocDelete}
          />
        </div>
      </div>
    </div>
  );
}
const colorMap: Record<string, string> = {
  blue:  "bg-blue-50",
  pink:  "bg-pink-50",
  amber: "bg-amber-50",
};

function DocColumn({
  title, color, documents, uploading, onAdd, onPreview, onDelete,
}: {
  title: string; color: string; category: string; documents: DocumentItem[]; uploading: boolean;
  onAdd: () => void; onPreview: (d: DocumentItem) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className={`${colorMap[color]} rounded-xl p-4 space-y-3`}>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>

      {documents.map((doc) => (
        <div key={doc._id} className="bg-white rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <FileText size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                <p className="text-xs text-gray-400">
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button onClick={() => onDelete(doc._id)} className="text-gray-300 hover:text-red-500 flex-shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
          <button
            onClick={() => onPreview(doc)}
            className="text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg py-1.5 transition"
          >
            Preview
          </button>
        </div>
      ))}

      <button
        onClick={onAdd}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-dashed border-gray-300 rounded-lg py-2.5 transition disabled:opacity-50"
      >
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        Add another document
      </button>
    </div>
  );
}
/* ============================================================
   SUB-COMPONENTS
   ============================================================ */

function MetaField({
  label, value, editing, onChange,
}: {
  label: string; value: string; editing: boolean; onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      {editing ? (
        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-sm font-semibold text-gray-900 border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
        />
      ) : (
        <p className="text-sm font-semibold text-gray-900">{value || "—"}</p>
      )}
    </div>
  );
}

function SectionCard({
  title, subtitle, editing, children,
}: {
  title: string; subtitle?: string; editing: boolean; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {editing && (
          <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">
            Editing
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-5">{children}</div>;
}

function Field({
  label, value, editing, onChange, type = "text", className = "",
}: {
  label: string; value: string; editing: boolean;
  onChange: (v: string) => void; type?: string; className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      {editing ? (
        <input
          type={type}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-sm font-medium text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
        />
      ) : (
        <p className="text-sm font-semibold text-gray-900">{value || "—"}</p>
      )}
    </div>
  );
}

function SelectField({
  label, value, editing, options, onChange,
}: {
  label: string; value: string; editing: boolean;
  options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      {editing ? (
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-sm font-medium text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
        >
          <option value="">Select…</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <p className="text-sm font-semibold text-gray-900 capitalize">{value || "—"}</p>
      )}
    </div>
  );
}
