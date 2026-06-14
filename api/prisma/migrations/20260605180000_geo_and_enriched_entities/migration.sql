-- Country & City reference data
CREATE TABLE "tabCountry" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "name" VARCHAR(140) NOT NULL,
    "iso_code" VARCHAR(10) NOT NULL,
    "phone_code" VARCHAR(20),
    CONSTRAINT "tabCountry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tabCountry_iso_code_key" ON "tabCountry"("iso_code");

CREATE TABLE "tabCity" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "name" VARCHAR(140) NOT NULL,
    "country" VARCHAR(140) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    CONSTRAINT "tabCity_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tabCity_country_name_key" ON "tabCity"("country", "name");
ALTER TABLE "tabCity" ADD CONSTRAINT "tabCity_country_fkey" FOREIGN KEY ("country") REFERENCES "tabCountry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Branch enrichment
ALTER TABLE "tabBranch" ADD COLUMN "branch_code" VARCHAR(40);
ALTER TABLE "tabBranch" ADD COLUMN "city" VARCHAR(140);
ALTER TABLE "tabBranch" ADD COLUMN "country" VARCHAR(140);
ALTER TABLE "tabBranch" ADD COLUMN "latitude" DECIMAL(21,7);
ALTER TABLE "tabBranch" ADD COLUMN "longitude" DECIMAL(21,7);
ALTER TABLE "tabBranch" ADD COLUMN "checkin_radius" INTEGER;
ALTER TABLE "tabBranch" ADD COLUMN "phone" VARCHAR(40);
ALTER TABLE "tabBranch" ADD COLUMN "email" VARCHAR(140);
ALTER TABLE "tabBranch" ADD COLUMN "is_head_office" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tabBranch" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "tabBranch" ADD CONSTRAINT "tabBranch_city_fkey" FOREIGN KEY ("city") REFERENCES "tabCity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tabBranch" ADD CONSTRAINT "tabBranch_country_fkey" FOREIGN KEY ("country") REFERENCES "tabCountry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Department enrichment
ALTER TABLE "tabDepartment" ADD COLUMN "code" VARCHAR(40);
ALTER TABLE "tabDepartment" ADD COLUMN "description" TEXT;
ALTER TABLE "tabDepartment" ADD COLUMN "parent_department" VARCHAR(140);
ALTER TABLE "tabDepartment" ADD CONSTRAINT "tabDepartment_parent_department_fkey" FOREIGN KEY ("parent_department") REFERENCES "tabDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Designation enrichment
ALTER TABLE "tabDesignation" ADD COLUMN "description" TEXT;
ALTER TABLE "tabDesignation" ADD COLUMN "grade" VARCHAR(80);

-- Employee enrichment
ALTER TABLE "tabEmployee" ADD COLUMN "nationality" VARCHAR(140);
ALTER TABLE "tabEmployee" ADD COLUMN "marital_status" VARCHAR(80);
ALTER TABLE "tabEmployee" ADD COLUMN "address_line1" VARCHAR(255);
ALTER TABLE "tabEmployee" ADD COLUMN "address_line2" VARCHAR(255);
ALTER TABLE "tabEmployee" ADD COLUMN "city" VARCHAR(140);
ALTER TABLE "tabEmployee" ADD COLUMN "country" VARCHAR(140);
ALTER TABLE "tabEmployee" ADD COLUMN "province" VARCHAR(140);
ALTER TABLE "tabEmployee" ADD COLUMN "postal_code" VARCHAR(40);
ALTER TABLE "tabEmployee" ADD COLUMN "emergency_contact_name" VARCHAR(140);
ALTER TABLE "tabEmployee" ADD COLUMN "emergency_contact_phone" VARCHAR(40);
ALTER TABLE "tabEmployee" ADD COLUMN "national_id_number" VARCHAR(80);
ALTER TABLE "tabEmployee" ADD COLUMN "passport_number" VARCHAR(80);
ALTER TABLE "tabEmployee" ADD CONSTRAINT "tabEmployee_city_fkey" FOREIGN KEY ("city") REFERENCES "tabCity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tabEmployee" ADD CONSTRAINT "tabEmployee_country_fkey" FOREIGN KEY ("country") REFERENCES "tabCountry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
