import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Smart Campus Resource & Maintenance Management System',
  description: 'An academic DBMS Level 3 platform with PostgreSQL relational modeling, MongoDB outbox activity events, pgvector semantic search, and role-based operations.',
  openGraph: {
    title: 'Smart Campus Resource & Maintenance Management System',
    description: 'An academic DBMS Level 3 platform with PostgreSQL relational modeling, MongoDB outbox activity events, pgvector semantic search, and role-based operations.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Smart Campus Resource & Maintenance Management System',
    description: 'An academic DBMS Level 3 platform with PostgreSQL relational modeling, MongoDB outbox activity events, pgvector semantic search, and role-based operations.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
