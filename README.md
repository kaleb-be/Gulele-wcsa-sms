# WCS Office Support Management System

The WCS Office Support Management System is a full-stack web application developed for the **Women, Children and Social Affairs (WCSA) Office** in Gullele Sub-City, Addis Ababa, Ethiopia.

This system is designed to streamline the management of support distribution between non-governmental organizations (NGOs) and beneficiaries, including women with children, persons with disabilities, and the elderly. It replaces a manual paper-based system with a digital solution that ensures data integrity and prevents duplicate support assignments.

## Features

- **Dashboard**: Overview of key metrics including total active beneficiaries, active NGOs, and recent support records.
- **NGO Management**: Register and manage NGO profiles, focus areas, contact information, and service history.
- **Beneficiary Management**: Register and track beneficiaries with support for Kebele ID or Fayda ID validation.
- **Support Assignment**: A guided workflow to assign beneficiaries to NGOs for specific services with built-in duplicate prevention logic.
- **Service Management**: CRUD operations for managing the types of services offered (e.g., Food support, Medical aid).
- **Duplicate Prevention**: A critical business rule that prevents a beneficiary from receiving the same active service from multiple NGOs simultaneously.
- **Print-Optimized Views**: Clean, A4-formatted print views for reports and beneficiary profiles, meeting the office's requirement for physical records.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Google Sheets API v4 (used as a lightweight, familiar database for office staff)

## Database Structure (Google Sheets)

The system uses a single Google Spreadsheet with five primary sheets:
1.  **NGOs**: Basic info, focus areas, and status.
2.  **Beneficiaries**: Demographic info, ID types (Kebele/Fayda), and registration details.
3.  **Services**: Lookup table for available service types.
4.  **NGO_Services**: Mapping of which NGOs provide which services.
5.  **Support_Records**: The core table tracking assignments and history.

## Getting Started

### Environment Variables

To run this project, you will need to add the following environment variables to your `.env.local` file:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@email.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
```

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```