# Cyber I.T Masters — React Website v2

A production-oriented React/Vite frontend for Cyber I.T Masters, positioned as a full-service:

- Managed IT / MSP
- IT Solutions & Infrastructure
- Cybersecurity
- Microsoft 365 / Cloud
- Web Development
- Application Development
- DevOps / Cloud Engineering
- IT Procurement & Technology

## Run locally

```bash
npm install
npm run dev
```

Then open the Vite URL shown in the terminal.

## Production build

```bash
npm run build
npm run preview
```

## Logo

Put the existing `logo.png` in the project root's `public/` directory.

## Form integration

The current contact form prepares a `mailto:` enquiry so the frontend works without a backend. For production, replace the `submit()` handler in `src/App.jsx` with your preferred API/CRM endpoint.

## React Bits / Lightfall

The animated Lightfall hero uses OGL and is implemented in:
`src/components/Lightfall.jsx`

The component was adapted from the supplied React Bits Lightfall source. OGL is therefore included as a dependency.
