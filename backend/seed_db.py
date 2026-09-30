from app import create_app
from extensions import db
from models import User, Service, ServiceRequest, Blog
from datetime import datetime, timedelta

app = create_app()

with app.app_context():
    print("Dropping all tables...")
    db.drop_all()
    print("Creating all tables...")
    db.create_all()

    print("Seeding admin user...")
    admin = User(
        email="admin@fcorpse.com",
        role="admin",
        is_admin=True,
        first_name="Admin",
        last_name="FCorpse"
    )
    admin.set_password("admin123")
    db.session.add(admin)

    print("Seeding employee user...")
    employee = User(
        email="employee@fcorpse.com",
        role="employee",
        is_admin=False,
        first_name="Marcus",
        last_name="Thorne",
        phone="+1 555-014-9988",
        bio="Studio Operations & Dispatch Coordinator."
    )
    employee.set_password("employee123")
    db.session.add(employee)

    print("Seeding customer user...")
    customer = User(
        email="elena.vance@studio.com",
        role="customer",
        is_admin=False,
        first_name="Elena",
        last_name="Vance",
        phone="+1 555-019-8374",
        bio="Indie developer working on narrative atmospheric games."
    )
    customer.set_password("customer123")
    db.session.add(customer)
    db.session.commit()
    print("Users created: admin@fcorpse.com (admin), employee@fcorpse.com (employee), and elena.vance@studio.com (customer)")

    print("Seeding services...")
    services = [
        Service(
            title="Game Development",
            description="Full-cycle game development from concept to release. We craft immersive worlds with handwritten code, original art, and meticulous attention to game-feel. Every mechanic is playtested and tuned by human hands.",
            icon="🎮",
            price="Custom Commission",
            category="Game Engineering"
        ),
        Service(
            title="Art Direction & Concept Design",
            description="Botanical-architectural visual identity for your game or brand. We blend classical structure with organic life to create visual languages that feel alive, intentional, and unmistakably human-crafted.",
            icon="🎨",
            price="From $4,500",
            category="Visual Art & Design"
        ),
        Service(
            title="Spatial Sound & Audio Landscapes",
            description="Handcrafted audio landscapes and sound effects that give your game world physical weight and emotional depth. From ambient environments to punchy UI feedback — custom synthesis and Foley recording.",
            icon="🎵",
            price="From $2,800",
            category="Audio & Sound"
        ),
        Service(
            title="QA & Playtesting Telemetry",
            description="Thorough quality assurance and human playtesting to ensure your game is polished, balanced, and genuinely fun. Structured telemetry, bug logging, and gameplay feel evaluation.",
            icon="🔍",
            price="From $1,500",
            category="QA & Evaluation"
        ),
        Service(
            title="Custom Shader & Procedural Generation Tools",
            description="Bespoke compute shaders, foliage wind simulation, procedural biome placement, and high-performance graphics engineering tailored for Godot, Unity, and custom C++ pipelines.",
            icon="⚡",
            price="Custom Commission",
            category="Game Engineering"
        ),
        Service(
            title="Interactive Narrative & Lore Architecture",
            description="Worldbuilding monographs, nonlinear narrative design, environmental storytelling, and lore architecture for atmospheric mystery and exploratory adventures.",
            icon="📜",
            price="Contact Us",
            category="Visual Art & Design"
        ),
    ]
    db.session.add_all(services)
    db.session.commit()
    print(f"Created {len(services)} sample services.")

    print("Seeding studio dispatches / blogs...")
    blogs = [
        Blog(
            title="Crafting Hand-Drawn Foliage Shaders in Real-Time",
            author="Elena Vance",
            category="Engineering",
            content="A deep dive into our custom vertex wind distortion and botanical foliage rendering pipeline. We balance painterly silhouette clarity with responsive physical reactiveness across dynamic weather states.",
            created_at=datetime.utcnow() - timedelta(days=2)
        ),
        Blog(
            title="The Architecture of Silence: Environmental Sound Design",
            author="Marcus Thorne",
            category="Audio",
            content="Why negative space and acoustic stillness matter more than continuous music in atmospheric exploration games. Practical notes on Foley recording, material resonance, and reverb zoning.",
            created_at=datetime.utcnow() - timedelta(days=6)
        ),
        Blog(
            title="Handmade Aesthetics: Rejecting Procedural Homogeneity",
            author="Admin",
            category="Art Direction",
            content="In an era of rapid generative output, deliberate human imperfections become our greatest stylistic asset. Notes from our monograph art direction workshop on botanical illustration.",
            created_at=datetime.utcnow() - timedelta(days=14)
        ),
        Blog(
            title="Optimizing Physics Queries for Procedural Caverns",
            author="Elena Vance",
            category="Engineering",
            content="Overcoming spatial query bottlenecks in large procedural underground chambers. How custom spatial hashing reduced broadphase collision overhead by 68% in complex geometry.",
            created_at=datetime.utcnow() - timedelta(days=22)
        ),
        Blog(
            title="Studio Dispatch 04: The Debut Project Roadmap",
            author="Admin",
            category="Studio News",
            content="Milestone Q3 recap and upcoming closed alpha testing invitations. Our team is expanding development on core mechanics, inventory crafting, and atmospheric lighting.",
            created_at=datetime.utcnow() - timedelta(days=35)
        ),
    ]
    db.session.add_all(blogs)
    db.session.commit()
    print(f"Created {len(blogs)} sample blog posts.")

    print("Seeding customer service requests...")
    sample_requests = [
        ServiceRequest(
            user_id=customer.id,
            service_id=services[0].id,
            service_title="Game Development",
            name="Elena Vance",
            email="elena.vance@studio.com",
            phone="+1 555-019-8374",
            company="Vance Interactive",
            message="We require full-cycle engineering for an isometric mystery puzzle game built in Godot. Target release Q4 next year. Looking for custom shaders, physics-based puzzle logic, and procedural room transitions.",
            status="In Review",
            priority="High",
            admin_notes="Reviewed scope with technical lead. Sent NDA and scheduling discovery call for next Tuesday.",
            estimated_cost="$18,000 - $24,000",
            created_at=datetime.utcnow() - timedelta(days=5)
        ),
        ServiceRequest(
            user_id=customer.id,
            service_id=services[1].id,
            service_title="Art Direction",
            name="Elena Vance",
            email="elena.vance@studio.com",
            phone="+1 555-019-8374",
            company="Vance Interactive",
            message="Botanical foliage concept sketches and environment moodboards for our subterranean biomes. Seeking high contrast linework with muted moss palettes.",
            status="In Progress",
            priority="Normal",
            admin_notes="Concept deck draft 1 dispatched to client. Awaiting palette feedback.",
            estimated_cost="$4,500",
            created_at=datetime.utcnow() - timedelta(days=12)
        ),
        ServiceRequest(
            user_id=None,
            service_id=services[2].id,
            service_title="Sound Design",
            name="Marcus Thorne",
            email="marcus@aetheria-studios.io",
            phone="+44 20 7946 0912",
            company="Aetheria Studios",
            message="Looking for bespoke sound effects for a dark fantasy roguelike: 80+ SFX including spell audio, weapon impacts, and cavern reverberations.",
            status="Pending",
            priority="Urgent",
            admin_notes="New inbound inquiry via public portal. Need to confirm delivery timeline.",
            estimated_cost=None,
            created_at=datetime.utcnow() - timedelta(hours=6)
        ),
        ServiceRequest(
            user_id=None,
            service_id=services[3].id,
            service_title="QA & Playtesting",
            name="Aria Sterling",
            email="aria@glassworks.dev",
            phone="+1 415-555-2671",
            company="Glassworks",
            message="Pre-launch beta testing round for our Steam demo. Need 30+ hours of structured telemetry, bug logging, and gameplay feel evaluation.",
            status="Completed",
            priority="Normal",
            admin_notes="Testing report delivered. Final invoice cleared.",
            estimated_cost="$3,200",
            created_at=datetime.utcnow() - timedelta(days=25)
        ),
        ServiceRequest(
            user_id=None,
            service_id=None,
            service_title="Custom Architecture Visualization",
            name="David Croft",
            email="d.croft@arch-visuals.net",
            phone=None,
            company="Croft Design Lab",
            message="Looking for an interactive WebGL architectural walkthrough. Very short deadline (2 weeks).",
            status="Rejected",
            priority="Low",
            admin_notes="Declined due to scheduling conflict with current milestone sprint.",
            estimated_cost=None,
            created_at=datetime.utcnow() - timedelta(days=18)
        )
    ]
    db.session.add_all(sample_requests)
    db.session.commit()
    print(f"Created {len(sample_requests)} sample service requests.")

