// Allowed routes for each plan
const allowedPages = {
  basic: [
    '/dashboard',
    '/animals',
    '/animals/new',
    '/health',
    '/health/new',
  ],
  intermediate: [
    '/dashboard',
    '/animals',
    '/animals/new',
    '/health',
    '/health/new',
    '/vaccinations',
    '/vaccinations/new',
    '/breeding',
    '/breeding/new',
  ],
  pro: [
    '/dashboard',
    '/animals',
    '/animals/new',
    '/health',
    '/health/new',
    '/vaccinations',
    '/vaccinations/new',
    '/breeding',
    '/breeding/new',
    '/maintenance',
    '/maintenance/new',
    '/incidents',
    '/incidents/new',
    '/farmhouse',
    '/farmhouse/new',
  ],
};

export default allowedPages; 