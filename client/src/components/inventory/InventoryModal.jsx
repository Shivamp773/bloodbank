import { useState } from 'react';
import { toast } from 'react-toastify';
import Modal from '../ui/Modal.jsx';
import { BloodGroupSelect, FormField } from '../ui/FormField.jsx';
import API, { getErrorMessage } from '../../services/api.js';
import { formatMl } from '../../utils/format.js';

const EMPTY = { inventoryType: 'in', bloodGroup: '', email: '', quantity: '450' };

/** Records blood received from a donor (IN) or issued to a hospital (OUT). Keeps the input if saving fails. */
export default function InventoryModal({ show, onClose, onSaved, stock }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const isIn = form.inventoryType === 'in';
  const available = stock?.find((group) => group.bloodGroup === form.bloodGroup)?.available ?? 0;

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const close = () => {
    if (saving) return;
    setForm(EMPTY);
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await API.post('/inventory', { ...form, quantity: Number(form.quantity) });
      toast.success(data.message);
      setForm(EMPTY);
      onSaved(data.inventory);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      show={show}
      title="Add inventory record"
      onClose={close}
      footer={
        <>
          <button type="button" className="btn btn-light" onClick={close} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="inventory-form" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            Save record
          </button>
        </>
      }
    >
      <form id="inventory-form" onSubmit={handleSubmit}>
        <fieldset className="mb-3">
          <legend className="form-label fw-semibold fs-6">Type</legend>
          <div className="btn-group w-100" role="group">
            <input
              type="radio"
              className="btn-check"
              name="inventoryType"
              id="type-in"
              checked={isIn}
              onChange={() => setForm({ ...form, inventoryType: 'in' })}
            />
            <label className="btn btn-outline-success" htmlFor="type-in">
              IN · from a donor
            </label>
            <input
              type="radio"
              className="btn-check"
              name="inventoryType"
              id="type-out"
              checked={!isIn}
              onChange={() => setForm({ ...form, inventoryType: 'out' })}
            />
            <label className="btn btn-outline-danger" htmlFor="type-out">
              OUT · to a hospital
            </label>
          </div>
        </fieldset>

        <BloodGroupSelect
          value={form.bloodGroup}
          onChange={update('bloodGroup')}
          hint={!isIn && form.bloodGroup ? `${formatMl(available)} of ${form.bloodGroup} in stock` : undefined}
          required
        />
        <FormField
          label={isIn ? 'Donor email' : 'Hospital email'}
          type="email"
          placeholder={isIn ? 'donor@example.com' : 'hospital@example.com'}
          hint={isIn ? 'Must belong to a registered donor.' : 'Must belong to a registered hospital.'}
          value={form.email}
          onChange={update('email')}
          required
        />
        <FormField
          label="Quantity (ml)"
          type="number"
          min={1}
          max={10000}
          step={1}
          hint={isIn ? 'A standard whole-blood donation is about 450 ml.' : undefined}
          value={form.quantity}
          onChange={update('quantity')}
          required
          className="mb-0"
        />
      </form>
    </Modal>
  );
}
