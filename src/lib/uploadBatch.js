/**
 * Run `items` through `worker` with bounded concurrency, isolating failures.
 *
 * This is the whole of RTPP-45's second acceptance criterion — "a failed upload
 * in a batch does not lose the successful ones". A `Promise.all` would reject on
 * the first failure and discard nineteen good uploads; a `Promise.allSettled`
 * would keep them but start all twenty at once. So: a bounded pool where each
 * item settles on its own.
 *
 * `onUpdate(index, patch)` reports each item's state as it changes, which is
 * what drives the per-file progress rows.
 */
export async function runBatch(items, worker, { concurrency = 3, onUpdate } = {}) {
  const results = items.map(() => ({ status: "pending", value: null, error: null }));
  let cursor = 0;

  const settle = (index, patch) => {
    results[index] = { ...results[index], ...patch };
    onUpdate?.(index, results[index]);
  };

  async function pump() {
    while (cursor < items.length) {
      const index = cursor++;
      settle(index, { status: "running" });

      try {
        const value = await worker(items[index], index, (progress) =>
          settle(index, { status: "running", progress }),
        );
        settle(index, { status: "done", value, progress: 1 });
      } catch (error) {
        // Swallowed on purpose: one bad file must not stop the pool.
        settle(index, { status: "failed", error });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => pump()),
  );

  return results;
}

export const succeeded = (results) => results.filter((r) => r.status === "done");
export const failed = (results) => results.filter((r) => r.status === "failed");

/**
 * POST one file straight to Cloudinary, reporting upload progress.
 *
 * XMLHttpRequest rather than fetch: fetch still cannot report *upload* progress,
 * and a twenty-file batch with no progress is the thing the acceptance criterion
 * is guarding against.
 *
 * The file never touches our API (§12), which is also why "no server timeout"
 * in the criterion is a property of the architecture rather than something to
 * tune — PHP is not in the path.
 */
export function uploadToCloudinary({ file, signature, onProgress, signal }) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", signature.api_key);
    form.append("timestamp", String(signature.timestamp));
    form.append("signature", signature.signature);
    form.append("folder", signature.folder);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", signature.upload_url, true);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    });

    xhr.addEventListener("load", () => {
      let body;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        return reject(new Error("Cloudinary returned something unreadable."));
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        return reject(new Error(body?.error?.message ?? `Upload failed (${xhr.status}).`));
      }
      resolve(body);
    });

    xhr.addEventListener("error", () => reject(new Error("The upload could not reach Cloudinary.")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled.")));

    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(form);
  });
}

/**
 * The subset of Cloudinary's response that `POST /admin/media` verifies.
 *
 * `version` goes as a string: Cloudinary sends a number, but only its text form
 * took part in the signature the API re-checks.
 */
export function toRegisterBody(cloudinary) {
  return {
    public_id: cloudinary.public_id,
    version: String(cloudinary.version),
    signature: cloudinary.signature,
    resource_type: cloudinary.resource_type,
    format: cloudinary.format,
    bytes: cloudinary.bytes,
    secure_url: cloudinary.secure_url,
    width: cloudinary.width ?? null,
    height: cloudinary.height ?? null,
  };
}
