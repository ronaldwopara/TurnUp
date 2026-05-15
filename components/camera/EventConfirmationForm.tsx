"use client";

type EditableEventFields = {
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
};

type EventConfirmationFormProps = {
  values: EditableEventFields;
  onChange: (next: EditableEventFields) => void;
  disabled?: boolean;
};

export function EventConfirmationForm({ values, onChange, disabled }: EventConfirmationFormProps) {
  return (
    <div className="camera-confirm-form">
      <label className="camera-confirm-field">
        <span>Title</span>
        <input
          value={values.title}
          disabled={disabled}
          onChange={(event) => onChange({ ...values, title: event.target.value })}
          placeholder="Event title"
        />
      </label>
      <label className="camera-confirm-field">
        <span>Date</span>
        <textarea
          value={values.date}
          disabled={disabled}
          onChange={(event) => onChange({ ...values, date: event.target.value })}
          placeholder={"e.g. 2026-01-06, Jan 6–8, 2026, or Jan 6, 7, & 8, 2026"}
          rows={2}
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      <label className="camera-confirm-field">
        <span>Time</span>
        <input
          value={values.time}
          disabled={disabled}
          onChange={(event) => onChange({ ...values, time: event.target.value })}
          placeholder="e.g. 6:30 PM - 8:00 PM"
        />
      </label>
      <label className="camera-confirm-field">
        <span>Location</span>
        <input
          value={values.location}
          disabled={disabled}
          onChange={(event) => onChange({ ...values, location: event.target.value })}
          placeholder="Location"
        />
      </label>
      <label className="camera-confirm-field">
        <span>Description</span>
        <textarea
          value={values.description}
          disabled={disabled}
          onChange={(event) => onChange({ ...values, description: event.target.value })}
          placeholder="Event description"
          rows={3}
        />
      </label>
    </div>
  );
}
