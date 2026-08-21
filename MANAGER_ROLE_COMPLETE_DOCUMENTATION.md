# 📊 COMPLETE MANAGER ROLE DOCUMENTATION
## GrainHero Platform — Manager Implementation Reference

**Version:** 1.0  
**Last Updated:** August 19, 2026  
**Status:** 97.5% Complete  
**Document Type:** Technical Reference & User Guide

---

## 📑 TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Manager Role Overview](#2-manager-role-overview)
3. [Manager Dashboard](#3-manager-dashboard)
4. [Quality Control Workflow](#4-quality-control-workflow)
5. [Buyer Approval Workflow](#5-buyer-approval-workflow)
6. [Team Management](#6-team-management)
7. [Warehouse & Silo Management](#7-warehouse--silo-management)
8. [Reporting & Analytics](#8-reporting--analytics)
9. [Monitoring & Incidents](#9-monitoring--incidents)
10. [Activity Logging & Audit Trail](#10-activity-logging--audit-trail)
11. [Permissions Matrix](#11-permissions-matrix)
12. [Technical Architecture](#12-technical-architecture)
13. [API Reference](#13-api-reference)
14. [Database Schema](#14-database-schema)
15. [Code References](#15-code-references)
16. [Known Issues & Roadmap](#16-known-issues--roadmap)

---

## 1. EXECUTIVE SUMMARY

### 🎯 Purpose
The Manager role serves as a mid-level supervisor in the GrainHero platform, overseeing day-to-day warehouse operations, quality control processes, and team management with administrative oversight.

### 👤 Role Definition
- **Position:** Mid-level supervisor between Admin and Technician
- **Primary Functions:** Quality control review, team supervision, buyer management
- **Key Characteristic:** Operates with admin oversight and approval workflows

### 📊 Implementation Stats
- **Code Volume:** ~6,000+ lines across 25+ files
- **Components Created:** 10+ React components
- **Backend Functions:** 25+ server functions
- **Database Tables:** 12+ tables with manager-specific columns
- **Completion Status:** 97.5% (Team invite debugging in progress)

### ✅ Key Features
1. **Manager-Specific Dashboard** with 13 KPIs, charts, and operational cards
2. **Quality Control Pipeline** with manager review and 6-hour override approval
3. **Buyer Approval Workflow** with 6-hour auto-approval timeout
4. **Team Management** for technician supervision and assignment
5. **Role-Based Access Control** with multi-layer approval workflows
6. **Activity Logging** with security event tracking for all manager actions
7. **Real-Time Updates** with 30-second refresh intervals

---

## 2. MANAGER ROLE OVERVIEW

### 🔐 Role Hierarchy

```
┌─────────────────┐
│  Super Admin    │  (Platform owner)
└────────┬────────┘
         │
┌────────▼────────┐
│     Admin       │  (Tenant owner - full control)
└────────┬────────┘
         │
┌────────▼────────┐
│    Manager      │  ← THIS ROLE (Supervised operations)
└────────┬────────┘
         │
┌────────▼────────┐
│  Technician     │  (Field worker - executes tasks)
└─────────────────┘
```

### 🎯 Core Responsibilities

#### A. Daily Operations
- Monitor silo capacity and grain storage conditions
- Review quality control submissions from technicians
- Assign technicians to batches and incidents
- Track dispatch readiness and buyer orders
- Oversee equipment (actuators) status

#### B. Quality Control
- Receive QC-ready batches from technicians
- Review QC test results (pass/fail decision)
- Override admin approval after 6-hour timeout (emergency provision)
- Handle failed batches (return to QC queue)
- Monitor QC pipeline for bottlenecks

#### C. Team Supervision
- Invite and manage technicians only (not admins or managers)
- Assign technicians to QC batches (1 technician per batch)
- Assign technicians to field incidents
- Monitor technician workload and assignments
- Track team on-shift status

#### D. Buyer Management
- Create new buyers (subject to admin approval)
- Edit own buyer records
- Monitor buyer order status
- Track pending buyer approvals

#### E. Incident Management
- Report field incidents (hardware, quality, pest, etc.)
- Assign technicians to investigate incidents
- Monitor incident resolution progress
- Participate in incident discussion threads

### 🚫 Restrictions

#### Cannot Do:
1. ❌ **Cannot create warehouses** (Admin-only)
2. ❌ **Cannot rename/edit silos** (Admin-only)
3. ❌ **Cannot delete warehouses** (Admin-only)
4. ❌ **Cannot view unassigned warehouses** (Only sees warehouses where manager_id = self)
5. ❌ **Cannot invite admins or managers** (Only technicians)
6. ❌ **Cannot access security events** (Admin-only)
7. ❌ **Cannot approve batches directly** (Must wait for admin or 6-hour timeout)
8. ❌ **Cannot approve buyers directly** (Must wait for admin or 6-hour timeout)
9. ❌ **Cannot modify warehouse capacity** (Admin-only)
10. ❌ **Cannot delete batches after admin approval** (Admin-only)

#### Can Do (With Restrictions):
1. ✅ **View warehouses** (Only assigned warehouses)
2. ✅ **Create batches** (Requires admin approval before stock commitment)
3. ✅ **Create buyers** (Requires admin approval before activation)
4. ✅ **Rename warehouses** (Only assigned warehouses - name field only)
5. ✅ **Review QC** (Pass/fail decision after technician submission)
6. ✅ **Override approval** (Only after 6-hour timeout from admin)

---

## 3. MANAGER DASHBOARD

### 📁 Files
- `src/components/dashboards/ManagerDashboard.tsx` (85 lines)
- `src/components/dashboards/ManagerKpiSummary.tsx` (400+ lines)
- `src/components/dashboards/ManagerBento.tsx` (270+ lines)
- `src/components/dashboards/ManagerTeamStrip.tsx` (80 lines)
- `src/lib/manager-dashboard.functions.ts` (200+ lines)

### 🎨 Layout Structure

```
┌──────────────────────────────────────────────────┐
│           WELCOME BANNER                          │
│  Good morning, [Manager Name]                     │
└──────────────────────────────────────────────────┘
