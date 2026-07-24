import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useGetCompanyQuery, useUpdateCompanyMutation } from '../../api/reportsApi';

export default function CompanySettings() {
  const { data: company, isLoading } = useGetCompanyQuery();
  const [updateCompany, { isLoading: saving }] = useUpdateCompanyMutation();
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    if (company) reset(company);
  }, [company, reset]);

  const onSubmit = async (data) => {
    try {
      await updateCompany(data).unwrap();
      toast.success('Company settings saved');
    } catch (err) { toast.error(err.data?.message || 'Failed to save'); }
  };

  if (isLoading) return <div className="card p-12 text-center text-gray-400">Loading…</div>;

  return (
    <div className="card max-w-2xl">
      <div className="px-6 py-4 border-b">
        <h1 className="text-lg font-bold text-gray-900">Company Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Update your company information and registration details</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className="form-label">Company Name</label>
            <input {...register('name')} className="input" placeholder="Company name" />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Address</label>
            <textarea {...register('address')} className="input" rows={3} placeholder="Street address" />
          </div>
          <div>
            <label className="form-label">Phone</label>
            <input {...register('phone')} className="input" placeholder="+94 11 123 4567" />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input {...register('email')} className="input" type="email" placeholder="info@company.lk" />
          </div>
          <div>
            <label className="form-label">TIN Number</label>
            <input {...register('tin_number')} className="input" placeholder="TIN / Tax ID" />
          </div>
          <div>
            <label className="form-label">VAT Number</label>
            <input {...register('vat_number')} className="input" placeholder="VAT registration number" />
          </div>
          <div>
            <label className="form-label">Currency</label>
            <input {...register('currency')} className="input" placeholder="LKR" maxLength={3} />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
