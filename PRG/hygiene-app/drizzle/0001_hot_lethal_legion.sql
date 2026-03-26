CREATE TABLE `checklist_completions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`checklistId` int NOT NULL,
	`completedBy` int NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	`completedItems` text NOT NULL,
	`status` enum('complete','partial','pending') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `checklist_completions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checklist_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`checklistId` int NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`label` varchar(512) NOT NULL,
	`description` text,
	`isRequired` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `checklist_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checklists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`frequency` enum('daily','weekly','monthly') NOT NULL,
	`category` varchar(128),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checklists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cleaning_completions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cleaningPlanId` int NOT NULL,
	`completedBy` int NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cleaning_completions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cleaning_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`area` varchar(256) NOT NULL,
	`task` varchar(512) NOT NULL,
	`frequency` enum('daily','weekly','monthly') NOT NULL,
	`cleaningAgent` varchar(256),
	`assignedTo` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cleaning_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `goods_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierName` varchar(256) NOT NULL,
	`deliveryNote` varchar(128),
	`productName` varchar(256) NOT NULL,
	`productCategory` enum('meat','fish','dairy','vegetables','frozen','dry_goods','beverages','other') NOT NULL,
	`quantityKg` decimal(8,2),
	`deliveryTemperature` int,
	`requiredMinTemp` int,
	`requiredMaxTemp` int,
	`temperatureOk` boolean,
	`packagingOk` boolean NOT NULL DEFAULT true,
	`labelingOk` boolean NOT NULL DEFAULT true,
	`qualityAccepted` boolean NOT NULL DEFAULT true,
	`rejectionReason` text,
	`notes` text,
	`receivedBy` int NOT NULL,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `goods_receipts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `haccp_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`haccpPointId` int NOT NULL,
	`entryDate` timestamp NOT NULL DEFAULT (now()),
	`status` enum('ok','deviation','corrective_action','pending') NOT NULL DEFAULT 'pending',
	`description` text,
	`correctiveAction` text,
	`recordedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `haccp_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `haccp_points` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pointNumber` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`isApplicable` boolean NOT NULL DEFAULT true,
	`inapplicableReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `haccp_points_id` PRIMARY KEY(`id`),
	CONSTRAINT `haccp_points_pointNumber_unique` UNIQUE(`pointNumber`)
);
--> statement-breakpoint
CREATE TABLE `pest_controls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inspectionDate` timestamp NOT NULL,
	`inspector` varchar(256) NOT NULL,
	`area` varchar(256) NOT NULL,
	`pestType` varchar(128),
	`findingsDescription` text,
	`measuresToken` text,
	`photoUrl` text,
	`nextInspectionDate` timestamp,
	`status` enum('ok','findings','treated','follow_up') NOT NULL DEFAULT 'ok',
	`recordedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pest_controls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `temperature_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`location` varchar(128) NOT NULL,
	`locationCategory` enum('fridge','freezer','storage','food_hot','food_cold','delivery') NOT NULL,
	`temperatureCelsius` int NOT NULL,
	`minThreshold` int,
	`maxThreshold` int,
	`isWithinRange` boolean NOT NULL DEFAULT true,
	`notes` text,
	`recordedBy` int NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `temperature_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `training_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trainingTitle` varchar(256) NOT NULL,
	`trainingDate` timestamp NOT NULL,
	`trainer` varchar(256) NOT NULL,
	`participantIds` text NOT NULL,
	`topics` text,
	`notes` text,
	`recordedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `training_records_id` PRIMARY KEY(`id`)
);
