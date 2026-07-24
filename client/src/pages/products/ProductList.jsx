import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Pencil, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { selectCurrentUser } from '../../store/authSlice';
import { useGetProductsQuery, useDeleteProductMutation } from '../../api/productsApi';
import { usePermission } from '../../hooks/usePermission';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import PageHeader from '../../components/ui/PageHeader';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import StatusBadge from '../../components/ui/StatusBadge';
import ProductForm from './ProductForm';
import { fmtCurrency } from '../../utils/format';

export default function ProductList() {
  const user = useSelector(selectCurrentUser);
  const canCreate = usePermission('inventory.create');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [formKey, setFormKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data, isLoading } = useGetProductsQuery({ search, page, limit: 20, is_active: true });
  const [deleteProduct, { isLoading: delLoading }] = useDeleteProductMutation();

  const openCreate = () => { setEditing(null); setFormKey(k => k + 1); setFormOpen(true); };
  const openEdit = (row) => { setEditing(row); setFormKey(k => k + 1); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  const handleDelete = async () => {
    try {
      await deleteProduct(deleting.id).unwrap();
      toast.success('Product deactivated');
      setDeleting(null);
    } catch (e) { toast.error(e.data?.message || 'Failed'); }
  };

  const columns = [
    { key: 'sku', header: 'SKU', className: 'font-mono text-xs' },
    { key: 'name', header: 'Product Name', cell: r => <span className="font-medium">{r.name}</span> },
    { key: 'category', header: 'Category', cell: r => r.Category?.name || '-' },
    { key: 'unit', header: 'Unit', cell: r => r.BaseUnit?.abbreviation || '-' },
    { key: 'cost_price', header: 'Cost', cell: r => fmtCurrency(r.cost_price), className: 'text-right' },
    { key: 'selling_price', header: 'Price', cell: r => <span className="font-medium text-primary-700">{fmtCurrency(r.selling_price)}</span>, className: 'text-right' },
    { key: 'vat_rate', header: 'VAT', cell: r => `${r.vat_rate}%`, className: 'text-center' },
    { key: 'status', header: 'Status', cell: r => <StatusBadge status={r.is_active} /> },
    {
      key: 'actions', header: '', className: 'text-right',
      cell: r => (
        <div className="flex items-center justify-end gap-1">
          {canCreate && <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Pencil size={14} /></button>}
          {canCreate && <button onClick={() => setDeleting(r)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>}
        </div>
      ),
    },
  ];

  return (
    <div className="card">
      <PageHeader title="Products" onNew={openCreate} canCreate={canCreate} search={search} onSearch={setSearch} />
      <Table columns={columns} data={data?.data} loading={isLoading} />
      <Pagination page={page} total={data?.total || 0} limit={20} onChange={setPage} />

      {formOpen && <ProductForm key={formKey} onClose={closeForm} editing={editing} companyId={user?.Role?.company_id || 1} />}

      <ConfirmDialog
        open={!!deleting}
        title="Deactivate Product"
        message={`Deactivate "${deleting?.name}"? It will no longer appear in orders.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        loading={delLoading}
      />
    </div>
  );
}
