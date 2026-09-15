import type { Appointment, Patient, Stat } from "./types";

export const stats: Stat[] = [
  { label: "Today's Appointments", value: "08", detail: "2 more than yesterday", trend: "+12%", icon: "calendar", tone: "teal" },
  { label: "Pending Requests", value: "03", detail: "Require your attention", trend: "New", icon: "clock", tone: "amber" },
  { label: "Completed", value: "24", detail: "This week so far", trend: "+8%", icon: "check", tone: "violet" },
  { label: "Total Patients", value: "1,284", detail: "Active patient records", trend: "+16", icon: "users", tone: "blue" },
];

export const requests: Appointment[] = [
  { id: "REQ-032", patient: "Rahul Sharma", initials: "RS", age: 34, reason: "General consultation", time: "05:30 PM", date: "Today", status: "Pending", color: "peach" },
  { id: "REQ-033", patient: "Priya Patil", initials: "PP", age: 29, reason: "Follow-up consultation", time: "06:00 PM", date: "Today", status: "Pending", color: "violet" },
];

export const todaysAppointments: Appointment[] = [
  { id: "APT-218", patient: "Aarav Mehta", initials: "AM", age: 42, reason: "Routine health checkup", time: "10:00 AM", status: "Confirmed", color: "blue" },
  { id: "APT-219", patient: "Neha Kulkarni", initials: "NK", age: 31, reason: "Skin consultation", time: "11:30 AM", status: "Confirmed", color: "violet" },
  { id: "APT-220", patient: "Vikram Singh", initials: "VS", age: 53, reason: "Blood pressure review", time: "02:00 PM", status: "Confirmed", color: "green" },
];

export const upcomingAppointments: Appointment[] = [
  { id: "APT-221", patient: "Sana Khan", initials: "SK", age: 26, reason: "General consultation", time: "10:30 AM", date: "Sun, 13 Sep", status: "Confirmed", color: "peach" },
  { id: "APT-222", patient: "Rohan Desai", initials: "RD", age: 38, reason: "Follow-up consultation", time: "04:00 PM", date: "Mon, 14 Sep", status: "Confirmed", color: "blue" },
  { id: "APT-223", patient: "Anita Rao", initials: "AR", age: 47, reason: "Diabetes management", time: "11:00 AM", date: "Tue, 15 Sep", status: "Confirmed", color: "violet" },
];

export const allBookings: Appointment[] = [
  ...todaysAppointments,
  ...requests,
  ...upcomingAppointments,
  { id: "APT-216", patient: "Kiran Joshi", initials: "KJ", age: 45, reason: "Annual wellness visit", time: "09:00 AM", date: "Fri, 11 Sep", status: "Completed", color: "green" },
];

export const patients: Patient[] = [
  { id: "PT-1004", name: "Aarav Mehta", initials: "AM", age: 42, gender: "Male", phone: "+91 98765 42618", lastVisit: "12 Sep 2026", visits: 8, color: "blue" },
  { id: "PT-1017", name: "Neha Kulkarni", initials: "NK", age: 31, gender: "Female", phone: "+91 98224 18490", lastVisit: "12 Sep 2026", visits: 4, color: "violet" },
  { id: "PT-1022", name: "Vikram Singh", initials: "VS", age: 53, gender: "Male", phone: "+91 98111 84731", lastVisit: "12 Sep 2026", visits: 12, color: "green" },
  { id: "PT-1051", name: "Priya Patil", initials: "PP", age: 29, gender: "Female", phone: "+91 97642 99103", lastVisit: "05 Sep 2026", visits: 3, color: "peach" },
  { id: "PT-1063", name: "Rahul Sharma", initials: "RS", age: 34, gender: "Male", phone: "+91 99812 32167", lastVisit: "30 Aug 2026", visits: 5, color: "peach" },
];
