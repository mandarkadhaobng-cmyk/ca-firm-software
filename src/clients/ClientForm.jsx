import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { clientService } from '../services/clientService';
import { employeeService } from '../services/employeeService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import LoadingSpinner from '../components/common/LoadingSpinner';

const INDUSTRY_OPTIONS = [
  'Manufacturing', 'Trading', 'Services', 'Real Estate', 'IT/Technology',
  'Healthcare', 'Education', 'Finance & Banking', 'Retail', 'Hospitality', 'Other'
].map(i => ({ value: i, label: i }));

const ClientForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getFirmId } = useAuthStore();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [partners, setPartners] = useState([]);
  const [managers, setManagers] = useState([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    const firmId = getFirmId();
    employeeService.getManagers(firmId).then(m => {
      setPartners(m.map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name}` })));
      setManagers(m.map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name}` })));
    });

    if (isEdit) {
      clientService.getById(id).then(c => {
        reset({
          client_name: c.client_name, client_code: c.client_code, pan_number: c.pan_number,
          gst_number: c.gst_number, industry: c.industry, address: c.address,
          city: c.city, state: c.state, email: c.email, phone: c.phone,
          assigned_partner_id: c.assigned_partner_id, assigned_manager_id: c.assigned_manager_id,
          status: c.status, notes: c.notes,
        });
        setPageLoading(false);
      });
    }
  }, [id]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = { ...data, firm_id: getFirmId() };
      if (isEdit) {
        await clientService.update(id, payload);
        toast.success('Client updated successfully');
      } else {
        await clientService.create(payload);
        toast.success('Client created successfully');
      }
      navigate('/clients');
    } catch (err) {
      toast.error(err.message || 'Failed to save client');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/clients')} className="p-2 hover:bg-gray-100 rounded-lg text-text-secondary">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-base font-semibold text-text-primary">{isEdit ? 'Edit Client' : 'Add New Client'}</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <h3 className="text-sm font-semibold text-text-primary mb-4">Client Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Client Name" required placeholder="Company Name" error={errors.client_name?.message}
              {...register('client_name', { required: 'Client name required' })} />
            <Input label="Client Code" required placeholder="CLI001" error={errors.client_code?.message}
              {...register('client_code', { required: 'Client code required' })} />
            <Input label="PAN Number" placeholder="ABCDE1234F" {...register('pan_number')} />
            <Input label="GST Number" placeholder="27ABCDE1234F1Z5" {...register('gst_number')} />
            <Select label="Industry" options={INDUSTRY_OPTIONS} placeholder="Select industry" {...register('industry')} />
            <Select label="Status" options={[
              { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'prospect', label: 'Prospect' }
            ]} {...register('status')} />
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-text-primary mb-4">Contact Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Email" type="email" placeholder="contact@company.com" {...register('email')} />
            <Input label="Phone" placeholder="+91 9876543210" {...register('phone')} />
            <Input label="City" placeholder="Mumbai" {...register('city')} />
            <Input label="State" placeholder="Maharashtra" {...register('state')} />
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-text-primary block mb-1">Address</label>
              <textarea rows={2} placeholder="Full address"
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                {...register('address')} />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-text-primary mb-4">Assignment</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Assigned Partner" options={partners} placeholder="Select partner" {...register('assigned_partner_id')} />
            <Select label="Assigned Manager" options={managers} placeholder="Select manager" {...register('assigned_manager_id')} />
          </div>
          <div className="mt-4">
            <label className="text-sm font-medium text-text-primary block mb-1">Notes</label>
            <textarea rows={2} placeholder="Internal notes about this client..."
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              {...register('notes')} />
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/clients')}>Cancel</Button>
          <Button type="submit" loading={loading}>{isEdit ? 'Update Client' : 'Create Client'}</Button>
        </div>
      </form>
    </div>
  );
};

export default ClientForm;
