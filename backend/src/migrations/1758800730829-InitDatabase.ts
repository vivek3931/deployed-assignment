import { MigrationInterface, QueryRunner } from "typeorm";

export class InitDatabase1758800730829 implements MigrationInterface {
    name = 'InitDatabase1758800730829'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."patients_gender_enum" AS ENUM('male', 'female', 'other')`);
        await queryRunner.query(`CREATE TABLE "patients" ("user_id" uuid NOT NULL, "date_of_birth" date, "gender" "public"."patients_gender_enum", "address" text, "emergency_contact" character varying(15), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7fe1518dc780fd777669b5cb7a0" PRIMARY KEY ("user_id"))`);
        await queryRunner.query(`CREATE TYPE "public"."appointments_status_enum" AS ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled')`);
        await queryRunner.query(`CREATE TYPE "public"."appointments_consultation_type_enum" AS ENUM('in_person', 'video_call', 'phone_call')`);
        await queryRunner.query(`CREATE TYPE "public"."appointments_booking_type_enum" AS ENUM('wave', 'stream')`);
        await queryRunner.query(`CREATE TYPE "public"."appointments_payment_status_enum" AS ENUM('pending', 'paid', 'refunded', 'failed')`);
        await queryRunner.query(`CREATE TABLE "appointments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "booking_reference" character varying(10) NOT NULL, "patient_id" uuid NOT NULL, "doctor_id" uuid NOT NULL, "availability_slot_id" uuid NOT NULL, "sub_slot_id" uuid, "appointment_date" date NOT NULL, "appointment_time" TIME NOT NULL, "appointment_end_time" TIME, "estimated_time" TIME, "duration" integer NOT NULL DEFAULT '30', "status" "public"."appointments_status_enum" NOT NULL DEFAULT 'scheduled', "consultation_type" "public"."appointments_consultation_type_enum" NOT NULL DEFAULT 'in_person', "booking_type" "public"."appointments_booking_type_enum" NOT NULL DEFAULT 'stream', "queue_position" integer, "priority" integer DEFAULT '1', "appointment_reason" text, "symptoms" text, "notes" text, "diagnosis" text, "prescription" text, "follow_up_instructions" text, "consultation_fee" numeric(10,2), "paid_amount" numeric(10,2), "payment_status" "public"."appointments_payment_status_enum" NOT NULL DEFAULT 'pending', "payment_method" character varying(100), "payment_transaction_id" character varying(100), "cancelled_by" character varying(50), "cancelled_at" TIMESTAMP, "cancellation_reason" text, "refund_amount" numeric(10,2), "reminder_sent" boolean NOT NULL DEFAULT false, "reminder_sent_at" TIMESTAMP, "confirmation_sent" boolean NOT NULL DEFAULT false, "confirmed_at" TIMESTAMP, "rating" integer, "patient_feedback" text, "doctor_feedback" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "checked_in_at" TIMESTAMP, "started_at" TIMESTAMP, "completed_at" TIMESTAMP, CONSTRAINT "UQ_9a936cfcbbc57b1087d0c3a7cbd" UNIQUE ("booking_reference"), CONSTRAINT "PK_4a437a9a27e948726b8bb3e36ad" PRIMARY KEY ("id")); COMMENT ON COLUMN "appointments"."rating" IS 'Rating from 1-5'`);
        await queryRunner.query(`CREATE TYPE "public"."appointment_sub_slots_status_enum" AS ENUM('available', 'full', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "appointment_sub_slots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "start_time" TIME NOT NULL, "end_time" TIME NOT NULL, "max_capacity" integer NOT NULL DEFAULT '1', "current_bookings" integer NOT NULL DEFAULT '0', "status" "public"."appointment_sub_slots_status_enum" NOT NULL DEFAULT 'available', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "availability_slot_id" uuid NOT NULL, CONSTRAINT "PK_dc00686d4d0917ca048c9c60629" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."doctor_availability_slots_schedule_type_enum" AS ENUM('wave', 'stream')`);
        await queryRunner.query(`CREATE TYPE "public"."doctor_availability_slots_consultation_type_enum" AS ENUM('in_person', 'video_call', 'phone_call', 'hybrid')`);
        await queryRunner.query(`CREATE TABLE "doctor_availability_slots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date NOT NULL, "start_time" TIME NOT NULL, "end_time" TIME NOT NULL, "sub_slot_duration" integer NOT NULL DEFAULT '30', "capacity_per_sub_slot" integer NOT NULL DEFAULT '1', "total_capacity" integer, "current_bookings" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, "schedule_type" "public"."doctor_availability_slots_schedule_type_enum" NOT NULL DEFAULT 'stream', "consultation_type" "public"."doctor_availability_slots_consultation_type_enum" NOT NULL DEFAULT 'in_person', "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "doctor_id" uuid NOT NULL, CONSTRAINT "PK_70724d770047ecfda8e0e172301" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."doctors_default_schedule_type_enum" AS ENUM('wave', 'stream')`);
        await queryRunner.query(`CREATE TABLE "doctors" ("user_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "specialization" character varying(100), "experience_years" integer, "education" text, "bio" text, "consultation_fee" numeric(10,2), "clinic_address" text, "profile_image" character varying(255), "is_accepting_patients" boolean NOT NULL DEFAULT true, "default_schedule_type" "public"."doctors_default_schedule_type_enum" NOT NULL DEFAULT 'stream', "default_slot_duration" integer, "advance_booking_days" integer NOT NULL DEFAULT '30', "same_day_booking_cutoff" integer NOT NULL DEFAULT '120', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_653c27d1b10652eb0c7bbbc4427" PRIMARY KEY ("user_id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('doctor', 'patient')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "name" character varying, "role" "public"."users_role_enum" NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."patient_profiles_preferred_units_enum" AS ENUM('metric', 'imperial')`);
        await queryRunner.query(`CREATE TABLE "patient_profiles" ("patient_id" uuid NOT NULL, "phone_number" character varying(15), "phone_verified" boolean NOT NULL DEFAULT false, "email_verified" boolean NOT NULL DEFAULT false, "profile_image" character varying(255), "preferred_units" "public"."patient_profiles_preferred_units_enum" NOT NULL DEFAULT 'metric', "notification_enabled" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_93e9bd4212c9d779fb8b4398bd7" PRIMARY KEY ("patient_id"))`);
        await queryRunner.query(`CREATE TABLE "availability" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date NOT NULL, "start_time" TIME NOT NULL, "end_time" TIME NOT NULL, "slot_duration" integer NOT NULL, "is_available" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "doctor_id" uuid, CONSTRAINT "PK_05a8158cf1112294b1c86e7f1d3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "patients" ADD CONSTRAINT "FK_7fe1518dc780fd777669b5cb7a0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_3330f054416745deaa2cc130700" FOREIGN KEY ("patient_id") REFERENCES "patients"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_4cf26c3f972d014df5c68d503d2" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_4690586de9464cb6ccb6aa8ed21" FOREIGN KEY ("availability_slot_id") REFERENCES "doctor_availability_slots"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_e692420b9fa62a8563cdaab0075" FOREIGN KEY ("sub_slot_id") REFERENCES "appointment_sub_slots"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointment_sub_slots" ADD CONSTRAINT "FK_602fc9ecc514a58243dfeaf7540" FOREIGN KEY ("availability_slot_id") REFERENCES "doctor_availability_slots"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "doctor_availability_slots" ADD CONSTRAINT "FK_521ab7050e887769aa553012771" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "doctors" ADD CONSTRAINT "FK_653c27d1b10652eb0c7bbbc4427" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patient_profiles" ADD CONSTRAINT "FK_93e9bd4212c9d779fb8b4398bd7" FOREIGN KEY ("patient_id") REFERENCES "patients"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "availability" ADD CONSTRAINT "FK_fc6c416f48a7d9349b9e4b17d6d" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "availability" DROP CONSTRAINT "FK_fc6c416f48a7d9349b9e4b17d6d"`);
        await queryRunner.query(`ALTER TABLE "patient_profiles" DROP CONSTRAINT "FK_93e9bd4212c9d779fb8b4398bd7"`);
        await queryRunner.query(`ALTER TABLE "doctors" DROP CONSTRAINT "FK_653c27d1b10652eb0c7bbbc4427"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability_slots" DROP CONSTRAINT "FK_521ab7050e887769aa553012771"`);
        await queryRunner.query(`ALTER TABLE "appointment_sub_slots" DROP CONSTRAINT "FK_602fc9ecc514a58243dfeaf7540"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_e692420b9fa62a8563cdaab0075"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_4690586de9464cb6ccb6aa8ed21"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_4cf26c3f972d014df5c68d503d2"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_3330f054416745deaa2cc130700"`);
        await queryRunner.query(`ALTER TABLE "patients" DROP CONSTRAINT "FK_7fe1518dc780fd777669b5cb7a0"`);
        await queryRunner.query(`DROP TABLE "availability"`);
        await queryRunner.query(`DROP TABLE "patient_profiles"`);
        await queryRunner.query(`DROP TYPE "public"."patient_profiles_preferred_units_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "doctors"`);
        await queryRunner.query(`DROP TYPE "public"."doctors_default_schedule_type_enum"`);
        await queryRunner.query(`DROP TABLE "doctor_availability_slots"`);
        await queryRunner.query(`DROP TYPE "public"."doctor_availability_slots_consultation_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."doctor_availability_slots_schedule_type_enum"`);
        await queryRunner.query(`DROP TABLE "appointment_sub_slots"`);
        await queryRunner.query(`DROP TYPE "public"."appointment_sub_slots_status_enum"`);
        await queryRunner.query(`DROP TABLE "appointments"`);
        await queryRunner.query(`DROP TYPE "public"."appointments_payment_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."appointments_booking_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."appointments_consultation_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."appointments_status_enum"`);
        await queryRunner.query(`DROP TABLE "patients"`);
        await queryRunner.query(`DROP TYPE "public"."patients_gender_enum"`);
    }

}
