import "../styles/globals.css";

export const metadata = {
  title: "English Web",
  description: "MVP"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
