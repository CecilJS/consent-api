import { z } from 'zod';

// Normalise first (trim, lowercase), then validate. Stored emails are always canonical.
export const Email = z.string().trim().toLowerCase().max(254).pipe(z.email());
export const Uuid = z.uuid();
export const CustomerIdParams = z.object({ customerId: Uuid });