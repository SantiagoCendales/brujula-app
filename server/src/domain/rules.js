export const ROLES = ['admin', 'coordinator', 'technician', 'cec', 'client'];

export const STATUSES = ['requested', 'assigned', 'on_site', 'report_ready', 'validated', 'returned', 'delivered'];

export const ACTIVITY_TYPES = ['gps_install', 'camera_install', 'sensor_install', 'maintenance', 'inspection', 'uninstall'];

export const PHOTO_CATEGORIES = ['plate', 'odometer', 'issue_found', 'issue_fixed', 'other'];

export const REQUIRED_PHOTOS = ['plate', 'odometer', 'issue_found', 'issue_fixed'];

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export const MAX_PHOTOS_PER_ACTIVITY = 20;

export const MAX_REPORT_LENGTH = 10_000;

export const TECHNICIAN_PENDING_STATUSES = ['assigned', 'on_site'];

export const TECHNICIAN_HISTORY_STATUSES = ['report_ready', 'validated', 'returned', 'delivered'];

// TODO(post-hackathon): only 'delivered' once the CEC validate/return flow is complete.
export const CLIENT_REPORT_VISIBLE_STATUSES = ['report_ready', 'validated', 'delivered'];
