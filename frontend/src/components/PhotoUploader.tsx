import { useState, useEffect } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { uploadPhoto, getViewUrl } from '../lib/api';

interface Props {
  frontId: string;
  initialKeys?: string[];
  onChange: (keys: string[]) => void;
}

/**
 * Photo grid with real S3 upload via presigned URLs.
 * Each selected file is uploaded immediately; the parent only sees the
 * final array of S3 keys.
 */
export function PhotoUploader({ frontId, initialKeys = [], onChange }: Props) {
  const [keys, setKeys] = useState<string[]>(initialKeys);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(0);

  useEffect(() => {
    // Lazy-load presigned GET URLs for any existing keys
    keys.forEach(async (k) => {
      if (previews[k]) return;
      try {
        const { url } = await getViewUrl(k);
        setPreviews((p) => ({ ...p, [k]: url }));
      } catch {
        /* swallow */
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.length]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading((n) => n + files.length);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const key = await uploadPhoto(frontId, file);
        uploaded.push(key);
        // Use local blob URL for instant preview while presigned arrives
        setPreviews((p) => ({ ...p, [key]: URL.createObjectURL(file) }));
      } catch (e) {
        console.error('upload failed', e);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    const next = [...keys, ...uploaded];
    setKeys(next);
    onChange(next);
  }

  function remove(key: string) {
    const next = keys.filter((k) => k !== key);
    setKeys(next);
    onChange(next);
  }

  return (
    <div>
      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          color: '#991b1b',
          fontSize: 14,
          fontWeight: 500,
          padding: '6px 0',
        }}
      >
        {uploading > 0 ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Upload size={15} />
        )}
        {uploading > 0
          ? `Subiendo ${uploading}…`
          : 'Seleccionar fotos'}
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFiles(e.target.files)}
          style={{ display: 'none' }}
        />
      </label>
      {keys.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 8,
            marginTop: 12,
          }}
        >
          {keys.map((k) => (
            <div key={k} style={{ position: 'relative' }}>
              {previews[k] ? (
                <img
                  src={previews[k]}
                  alt=""
                  style={{
                    width: '100%',
                    height: 100,
                    objectFit: 'cover',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: 100,
                    background: '#f3f4f6',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af',
                    fontSize: 12,
                  }}
                >
                  cargando…
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(k)}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  background: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  padding: 4,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
