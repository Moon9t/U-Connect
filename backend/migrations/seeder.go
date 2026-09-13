package migrations

import (
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/bxcodec/faker/v3"
	"github.com/uconnect/backend/internal/models"
	"github.com/uconnect/backend/pkg/utils"
	"gorm.io/gorm"
)

// Seed populates the database with realistic sample data:
// - 5 Departments
// - 20 Users (4 Admins, 6 Staff, 10 Students)
// - 520 Complaints (with SLA breaches, ~1/3 anonymous, realistic dates across 120 days)
func Seed(db *gorm.DB) error {
	log.Println("Starting database seeding...")

	// 1. Seed Departments
	depts := []models.Department{
		{Name: "Information Technology Services", Code: "IT", Description: "Campus networking, software systems, computer labs, and portal access"},
		{Name: "Facilities & Campus Maintenance", Code: "FAC", Description: "Physical infrastructure, air conditioning, plumbing, and electricity"},
		{Name: "Academic Affairs & Registrar", Code: "ACAD", Description: "Course registration, timetables, lecturer feedback, and grading issues"},
		{Name: "Examinations Management Unit", Code: "EXAM", Description: "Exam hall facilities, examination schedules, seating, and invigilation"},
		{Name: "Campus Safety & Security", Code: "SAFE", Description: "Campus emergency response, safety hazards, physical security, and health"},
	}

	for i := range depts {
		var existing models.Department
		if err := db.Where("code = ?", depts[i].Code).First(&existing).Error; err != nil {
			if err := db.Create(&depts[i]).Error; err != nil {
				return fmt.Errorf("failed to seed department %s: %w", depts[i].Code, err)
			}
		} else {
			depts[i] = existing
		}
	}

	// 2. Seed Users
	defaultPassword := "password123"
	hashedPassword, err := utils.HashPassword(defaultPassword)
	if err != nil {
		return fmt.Errorf("failed to hash seed password: %w", err)
	}

	var users []models.User

	// 4 Admins (including admin@test.com)
	adminEmails := []string{"admin@test.com", "admin2@uconnect.edu", "admin3@uconnect.edu", "admin4@uconnect.edu"}
	adminNames := []string{"Admin", "Sarah Jenkins", "Michael Chang", "Diana Ross"}
	for i, email := range adminEmails {
		users = append(users, models.User{
			Name:         adminNames[i],
			Email:        email,
			PasswordHash: hashedPassword,
			Role:         models.RoleAdmin,
			DepartmentID: &depts[i%len(depts)].ID,
		})
	}

	// 6 Staff
	staffNames := []string{"David Miller", "Emma Watson", "James Wilson", "Patricia Moore", "Robert Taylor", "Linda Anderson"}
	for i, name := range staffNames {
		users = append(users, models.User{
			Name:         name,
			Email:        fmt.Sprintf("staff%d@uconnect.edu", i+1),
			PasswordHash: hashedPassword,
			Role:         models.RoleStaff,
			DepartmentID: &depts[i%len(depts)].ID,
		})
	}

	// 10 Students
	studentNames := []string{"Alex Turner", "Bethany Clark", "Carlos Gomez", "Daniela Vega", "Ethan Hunt", "Fiona Gallagher", "George Vance", "Hannah Abbott", "Ian Malcolm", "Julia Roberts"}
	for i, name := range studentNames {
		users = append(users, models.User{
			Name:         name,
			Email:        fmt.Sprintf("student%d@uconnect.edu", i+1),
			PasswordHash: hashedPassword,
			Role:         models.RoleStudent,
			DepartmentID: &depts[i%len(depts)].ID,
		})
	}

	var seededUsers []models.User
	for i := range users {
		var existing models.User
		if err := db.Where("email = ?", users[i].Email).First(&existing).Error; err != nil {
			if err := db.Create(&users[i]).Error; err != nil {
				return fmt.Errorf("failed to seed user %s: %w", users[i].Email, err)
			}
			seededUsers = append(seededUsers, users[i])
		} else {
			seededUsers = append(seededUsers, existing)
		}
	}

	// Filter student users for complaint attribution
	var studentUsers []models.User
	for _, u := range seededUsers {
		if u.Role == models.RoleStudent {
			studentUsers = append(studentUsers, u)
		}
	}

	// 3. Seed 520 Complaints
	var currentCount int64
	db.Model(&models.Complaint{}).Count(&currentCount)
	if currentCount >= 520 {
		log.Printf("Database already contains %d complaints, skipping seed.", currentCount)
		return nil
	}

	needed := 520 - int(currentCount)
	categories := []string{
		models.CategoryIT,
		models.CategoryFacilities,
		models.CategoryAcademic,
		models.CategoryExamHall,
		models.CategorySafety,
		models.CategoryFinance,
		models.CategoryStudentAffairs,
	}

	statuses := []string{
		models.StatusPending,
		models.StatusInProgress,
		models.StatusResolved,
		models.StatusClosed,
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	now := time.Now()

	complaintsBatch := make([]models.Complaint, 0, needed)

	for i := 0; i < needed; i++ {
		category := categories[rng.Intn(len(categories))]
		student := studentUsers[rng.Intn(len(studentUsers))]
		dept := depts[rng.Intn(len(depts))]

		// Random date within last 120 days
		daysAgo := rng.Intn(120)
		hoursAgo := rng.Intn(24)
		createdAt := now.AddDate(0, 0, -daysAgo).Add(-time.Duration(hoursAgo) * time.Hour)

		// 1/3 anonymous
		anonymous := (i%3 == 0)

		// Status selection: ensure reasonable distribution
		status := statuses[rng.Intn(len(statuses))]

		// Force first 40 complaints to be SLA breached: pending & older than 72h
		if i < 40 {
			status = models.StatusPending
			createdAt = now.Add(-time.Duration(75+i*2) * time.Hour)
		}

		title := faker.Sentence()
		if len(title) > 80 {
			title = title[:80]
		}
		description := faker.Paragraph()

		// Occasionally include critical trigger keywords
		if i%15 == 0 {
			description = "URGENT: Emergency situation observed in campus building. Immediate attention required: " + description
		}

		complaint := models.Complaint{
			Title:        title,
			Description:  description,
			Category:     category,
			Status:       status,
			Anonymous:    anonymous,
			SLAEscalated: false,
			UserID:       student.ID,
			DepartmentID: dept.ID,
			CreatedAt:    createdAt,
			UpdatedAt:    createdAt,
		}

		// Apply Rule 1: Auto-escalation
		complaint.ApplyAutoEscalation()

		// Handle resolution dates
		if status == models.StatusResolved || status == models.StatusClosed {
			resHours := 2 + rng.Intn(46)
			resTime := createdAt.Add(time.Duration(resHours) * time.Hour)
			if resTime.After(now) {
				resTime = now.Add(-time.Minute)
			}
			complaint.ResolvedAt = &resTime
		}

		// Handle SLA breach escalation flag
		if complaint.IsSLABreached() && (i%2 == 0) {
			complaint.SLAEscalated = true
		}

		complaintsBatch = append(complaintsBatch, complaint)
	}

	// Insert in batches of 100
	batchSize := 100
	for i := 0; i < len(complaintsBatch); i += batchSize {
		end := i + batchSize
		if end > len(complaintsBatch) {
			end = len(complaintsBatch)
		}
		if err := db.Create(complaintsBatch[i:end]).Error; err != nil {
			return fmt.Errorf("failed to insert complaints batch: %w", err)
		}
	}

	var totalComplaints int64
	db.Model(&models.Complaint{}).Count(&totalComplaints)
	log.Printf("Database seeded successfully! Total complaints: %d (>= 520 target achieved)", totalComplaints)
	return nil
}
