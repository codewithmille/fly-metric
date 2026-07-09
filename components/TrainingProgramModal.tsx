'use client'

import { useState, useEffect, useRef } from 'react'

interface TrainingProgramModalProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'schedule' | 'progression' | 'feeding' | 'recovery' | 'supplements'
type DayType = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'
type DistanceType = 'short' | 'medium'

interface WeeklyStep {
  title: string
  subtitle: string
  icon: string
  focus: string
  schedule: string[]
  feeding: string
  supplements: string
}

const weeklySteps: WeeklyStep[] = [
  {
    title: 'Race Return / Rest',
    subtitle: 'Day of Return',
    icon: '🏁',
    focus: 'Rehydration, detoxification, and physical rest.',
    schedule: [
      '08:00 AM – 12:00 PM (Race Return): Pag-uwi ng mga ibon, bigyan agad ng lukewarm water na may Electrolytes + Glucose o Honey para mabilis ma-restore ang energy at maiwasan ang dehydration.',
      '12:00 PM – 02:00 PM (Digestive Check): Pakanin ng 100% light depurative (diet) seed mix. Huwag bigyan ng mabigat na grains dahil stress pa ang digestive tract.',
      '02:00 PM (Rest Phase): Diliman ang loft at panatilihing tahimik para makapagpahinga ng maayos ang mga ibon nang walang istorbo.',
      '04:30 PM (Evening Feed): Bigyan ng kaunting depurative feed (half serving).',
      '06:00 PM (Health Check & Drops): Patakan ang mga mata at ilong ng disinfectant drops. Suriin ang bawat ibon kung may sugat o pinsala sa pakpak/paa.'
    ],
    feeding: '100% Depurative (diet seeds) - easy to digest, low protein, moderate carbohydrate.',
    supplements: 'Electrolytes + Glucose in drinking water immediately. Probiotics in the evening feed.'
  },
  {
    title: 'Recovery & Bath',
    subtitle: 'Day 1 after return',
    icon: '🛁',
    focus: 'Gut recovery, bathing, and mental relaxation.',
    schedule: [
      '06:00 AM – 07:00 AM (Morning Free Fly): Buksan ang loft para sa 30 minutong boluntaryong lipad (voluntary flying). Huwag pilitin o flag-in ang mga ibon.',
      '07:30 AM (Bathing Routine): Maglagay ng paliguan (bath tub) sa loft garden na may warm water at bath salts (nakakatulong mag-relax ng dibdib at maglinis ng balahibo).',
      '08:30 AM (Morning Feed): Pakanin ng 50% depurative mix + 50% sport/breed mix na binasa sa lemon juice o probiotics.',
      '11:00 AM (Loft Hygiene): Alisin ang bathtub. Linisin, ikaskasan, at disimpektahin ang buong loft (loft scraping & spraying).',
      '04:30 PM (Evening Feed): Regular na feeding ng 50/50 mix. Dagdagan ng mineral grit at clay block sa grit tray.'
    ],
    feeding: '50% Depurative mix + 50% Sport/Breed mix.',
    supplements: 'Probiotics + Liver Support (e.g. Sedochol or herbal extracts) in water.'
  },
  {
    title: 'Muscle Rebuilding',
    subtitle: 'Day 2 after return',
    icon: '💪',
    focus: 'Protein intake to repair muscle fibers and tissue.',
    schedule: [
      '05:30 AM – 06:15 AM (Morning forced training): Palipadin ang mga ibon gamit ang flag ng 45 minutes para ma-stretch at gumaling ang muscle fibers.',
      '07:00 AM (Morning Feed): Bigyan ng 70% Sport mix + 30% Protein-rich seeds (peas, vetches, horse beans) para sa muscle tissue repair.',
      '08:30 AM (Loft Separation): Paghiwalayin muli ang mga barako (cocks) at babae (hens) kung gumagamit ng widowhood system.',
      '04:00 PM – 04:45 PM (Afternoon Flight): Ikalawang forced fly session ng 45 minutes para sa stamina build-up.',
      '05:30 PM (Evening Feed): Sundan ng protein-rich feed. Maglagay ng sariwang mineral grit.'
    ],
    feeding: '70% Sport mix + 30% Protein-rich seeds (Maple peas, dun peas, vetches, horse beans).',
    supplements: 'Amino acids + Vitamin B12 in water to facilitate protein synthesis.'
  },
  {
    title: 'Stamina Conditioning',
    subtitle: 'Day 3 after return',
    icon: '⚡',
    focus: 'Building aerobic capacity and metabolic conditioning.',
    schedule: [
      '05:30 AM – 06:30 AM (Forced Loft Fly): Taasan ang pagpapalipad hanggang 60 minutes gamit ang flag o sipol. Obserbahan ang pag-flock ng mga ibon.',
      '07:00 AM (Morning Feed): Bigyan ng 100% Sport mix (walang depurative). Water with Apple Cider Vinegar para mapanatili ang tamang pH sa bituka.',
      '09:00 AM (Loft Sanitation): Scrape ang dumi at palitan ang inuman ng malinis na tubig.',
      '04:00 PM – 05:00 PM (Afternoon Flight): Palipadin muli ng 45–60 minutes. Suriin kung may nahuhuling ibon.',
      '05:30 PM (Evening Feed): Bigyan ng 100% Sport mix hanggang mabusog.'
    ],
    feeding: '100% Sport mix (rich in quality maize, wheat, and clean peas).',
    supplements: 'Apple Cider Vinegar (5ml per Litre) in water to maintain gut acidity and deter pathogens.'
  },
  {
    title: 'Power & Road Work',
    subtitle: 'Day 4 after return',
    icon: '🚀',
    focus: 'Stamina building and orientation training.',
    schedule: [
      '04:30 AM (Basketing for Toss): I-basket ang mga ibon nang madaling araw para sa road training toss.',
      '06:00 AM (Release Time): Bitawan ang mga ibon sa 30–50 km toss site sa malinaw na sikat ng araw at walang malakas na hamog.',
      '07:15 AM (Arrival Home): Pagdating ng mga ibon sa loft, patakbuhin sa electronic clock at painumin ng tubig na may Vitamin B12 + Liquid Iron.',
      '08:00 AM (Morning Feed): Pakanin ng 90% Sport mix + 10% Energy seeds (safflower, hemp, sunflower kernels).',
      '04:30 PM (Evening Feed): Bigyan ng Sport at Energy seeds hanggang sa mabusog. I-check ang crop kung matigas o lumambot na.'
    ],
    feeding: '90% Sport mix + 10% Energy seeds (Safflower, hemp, canola, sunflower kernels).',
    supplements: 'Vitamin B12 + Liquid Iron in water to boost red blood cell and oxygen capacity.'
  },
  {
    title: 'Carbohydrate Loading',
    subtitle: 'Day 5 after return',
    icon: '🔋',
    focus: 'Filling glycogen stores in muscles and liver.',
    schedule: [
      '06:00 AM – 06:30 AM (Voluntary Loft Fly): Hayaang lumipad nang malaya (free fly) ang mga ibon nang 30 minutes lamang. Huwag nang pilitin o i-flag.',
      '07:30 AM (Morning Feed): Pakanin ng 70% Sport mix + 30% High-fat energy seeds (peanuts, hemp seed, safflower) para magkarga ng taba/lipids.',
      '02:00 PM (Basket Prep): Linisin ang transport baskets, lagyan ng tuyong karton o wood shavings para sumipsip ng basa sa biyahe.',
      '04:30 PM (Motivation Phase): Ipakita saglit ang mga babae/lalaki (widowhood partner) sa loob ng 5-10 minutes para ganahan sila umuwi.',
      '05:15 PM (Heavy Evening Feed): Pakanin ng marami. Iwanan ang feed tray hanggang sa iwanan na nila ang pulang mais o mani.'
    ],
    feeding: '70% Sport mix + 30% High-fat energy seeds (peanuts, hemp seed, safflower, toasted soy).',
    supplements: 'Vitamin E + Selenium (muscle protection) + Electrolytes in water.'
  },
  {
    title: 'Basketing / Calmness',
    subtitle: 'Day 6 after return (Basketing)',
    icon: '📦',
    focus: 'Maintaining energy, hydration, and a calm nervous system.',
    schedule: [
      '06:00 AM – 06:20 AM (Stretch Fly): 20 minutong napaka-gaan at malayang lipad para lang ma-stretch ang mga pakpak.',
      '07:00 AM (Morning Feed): Magaan na almusal: purong mais at polished paddy rice (diet/easy carb conversion) para magaan ang crop sa basketing.',
      '12:00 PM (Fast Start): Alisin ang lahat ng tirang pagkain. Iwanan lang ang malinis at purong tubig sa loft.',
      '04:00 PM (Final Inspection): Suriin ang mga mata, tuka (dapat walang uhog), at balahibo ng bawat ibon bago ilagay sa basket.',
      '05:30 PM (Basketing Time): Dahan-dahang ilagay ang mga ibon sa basketing crates. Ibiyahe patungo sa club house/basketing station nang hindi nayayanig.'
    ],
    feeding: 'Light carbohydrates (pure maize and polished paddy rice). Do not overfeed.',
    supplements: 'Pure, fresh water (untreated) to ensure maximum water intake before transport.'
  }
]

export default function TrainingProgramModal({ isOpen, onClose }: TrainingProgramModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('schedule')
  const [returnDay, setReturnDay] = useState<DayType>('sat')
  const [activeDay, setActiveDay] = useState<DayType>('sat')
  const [activeDistance, setActiveDistance] = useState<DistanceType>('short')
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({})

  const modalRef = useRef<HTMLDivElement>(null)

  // Escape key support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!isOpen) return null

  const toggleStep = (stepId: string) => {
    setCompletedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }))
  }

  const DAYS_ORDER: DayType[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const returnDayIndex = DAYS_ORDER.indexOf(returnDay)
  
  // Reorder days starting from returnDay
  const getOrderedDays = (): DayType[] => {
    const startIndex = DAYS_ORDER.indexOf(returnDay)
    return [
      ...DAYS_ORDER.slice(startIndex),
      ...DAYS_ORDER.slice(0, startIndex)
    ]
  }

  // Create daysInfo dynamically based on selected returnDay!
  const daysInfo: Record<DayType, { title: string; subtitle: string; icon: string; focus: string; schedule: string[]; feeding: string; supplements: string }> = {} as any
  
  DAYS_ORDER.forEach((day) => {
    const dayIndex = DAYS_ORDER.indexOf(day)
    const stepIndex = (dayIndex - returnDayIndex + 7) % 7
    const step = weeklySteps[stepIndex]
    
    const dayNames: Record<DayType, string> = {
      sun: 'Sunday',
      mon: 'Monday',
      tue: 'Tuesday',
      wed: 'Wednesday',
      thu: 'Thursday',
      fri: 'Friday',
      sat: 'Saturday'
    }
    
    daysInfo[day] = {
      title: dayNames[day],
      subtitle: step.title,
      icon: step.icon,
      focus: step.focus,
      schedule: step.schedule,
      feeding: step.feeding,
      supplements: step.supplements
    }
  })

  const feedingBreakdown: Record<DistanceType, { title: string; range: string; fatStart: string; carboPercent: number; fatPercent: number; proteinPercent: number; depurativePercent: number; guidelines: string[]; feedBreakdownTable: { item: string; ratio: string; role: string }[] }> = {
    short: {
      title: 'Short Distance Program',
      range: '90 – 150 km',
      fatStart: '24 hours before basketing',
      carboPercent: 50,
      fatPercent: 15,
      proteinPercent: 15,
      depurativePercent: 20,
      guidelines: [
        'Focus on keeping pigeons light and active. Short races do not deplete deep fat reserves.',
        'Start loading fat/energy seeds on Thursday evening (24 hours before Friday basketing).',
        'Keep protein at moderate levels to avoid heavy muscle bulk.',
        'Utilise depurative (diet) feed at 20-30% of total ration early in the week (Sat-Mon) to cleanse the digestive system.'
      ],
      feedBreakdownTable: [
        { item: 'Depurative Mix', ratio: '20%', role: 'Digestive rest, detoxification' },
        { item: 'Sport/Racing Mix', ratio: '60%', role: 'Stamina base, starch, and amino acids' },
        { item: 'Energy/Fat Seeds', ratio: '10%', role: 'Safflower & Hemp for immediate energy' },
        { item: 'Paddy Rice & Wheat', ratio: '10%', role: 'Quick glycogen conversion' }
      ]
    },
    medium: {
      title: 'Medium Distance Program',
      range: '150 – 300 km',
      fatStart: '48 hours before basketing',
      carboPercent: 40,
      fatPercent: 30,
      proteinPercent: 15,
      depurativePercent: 15,
      guidelines: [
        'Requires substantial fat loading. Pigeons fly for 3–5 hours continuously.',
        'Begin energy and fat loading on Wednesday evening (48 hours before Friday basketing).',
        'Incorporate raw peanuts, hemp seed, and sunflower kernels for high lipid (fat) density.',
        'Decrease depurative feed to 15% and increase high-energy maize portions.'
      ],
      feedBreakdownTable: [
        { item: 'Sport/Racing Mix (Maize/Wheat/Peas)', ratio: '50%', role: 'Core glycogen and protein replenishment' },
        { item: 'Energy/Fat Seeds (Hemp/Safflower)', ratio: '20%', role: 'Lipid loading for endurance' },
        { item: 'Raw Peanuts (skin-on)', ratio: '15%', role: 'Highly digestible oil and concentrated energy' },
        { item: 'Paddy Rice & Toasted Soy', ratio: '15%', role: 'Starch and essential muscle-building fats' }
      ]
    }
  }

  const progressionSteps = [
    { id: 'step-1', stage: 'Stage 1', distance: 'Loft Flying', frequency: 'Daily (Morning & Evening)', notes: 'Birds must fly 60-90 minutes continuously around the loft. Use a flag if necessary. Focus on flock coordination.' },
    { id: 'step-2', stage: 'Stage 2', distance: '5 km Tosses', frequency: '3 tosses', notes: 'First road training. Release birds in a group in clear morning weather. Teach them to exit the basket immediately.' },
    { id: 'step-3', stage: 'Stage 3', distance: '10 km Tosses', frequency: '3 tosses', notes: 'Double the distance. Begin launching cocks and hens separately to introduce split-second motivation.' },
    { id: 'step-4', stage: 'Stage 4', distance: '20 km Tosses', frequency: '2 tosses', notes: 'Release under varying wind conditions. Toss from different angles relative to the home loft line.' },
    { id: 'step-5', stage: 'Stage 5', distance: '40 km Tosses', frequency: '2 tosses', notes: 'Simulate race conditions. Keep birds in baskets overnight before release to accustom them to confinement.' },
    { id: 'step-6', stage: 'Stage 6', distance: '60 km Tosses', frequency: '2 tosses', notes: 'Include single-ups or small groups (3-4 birds) to encourage independent navigation rather than follow-the-leader.' },
    { id: 'step-7', stage: 'Stage 7', distance: '90 km Toss', frequency: '1 final toss', notes: 'A full dress-rehearsal toss. Release at expected race time. Follow with 48 hours of recovery before racing.' }
  ]

  const recoveryItems = [
    { id: 'rec-1', phase: 'Immediate Return (Hour 0)', title: 'Hydration & Electrolytes', detail: 'lukewarm water containing electrolytes + glucose/honey. Replaces lost salts and provides instant blood sugar.' },
    { id: 'rec-2', phase: 'Recovery Feed (Hour 2)', title: 'Depurative Seeding', detail: 'Feed a light depurative seed mix (paddy rice, safflower, wheat, barley). Easy to digest; does not overload an exhausted digestive tract.' },
    { id: 'rec-3', phase: 'Post-Race Day (Hour 24)', title: 'Gut Microbiome Restore', detail: 'Apply probiotics to feed or drinking water. Re-establishes beneficial lactic acid bacteria destroyed by race stress.' },
    { id: 'rec-4', phase: 'Post-Race Day 2 (Hour 48)', title: 'Muscle Fiber Repair', detail: 'Administer B12 and Amino acids. Feed protein-rich grain mixtures (peas/beans) to repair microscopic muscle tears.' },
    { id: 'rec-5', phase: 'Visual Inspection', title: 'Breast Muscle Check', detail: 'Check breast muscles: should be bright pink/red. Dark blue or dry scales indicate severe dehydration or fatigue. If so, isolate the bird.' }
  ]

  const supplementsList = [
    { name: 'Vitamin B12', dose: '2-5 mcg per bird or 5ml/L water', timing: 'Wednesday & Thursday', benefits: 'Boosts red blood cell production, improves oxygen transport, increases stamina.' },
    { name: 'Iron (Liquid)', dose: '2ml per Litre of water', timing: 'Wednesday', benefits: 'Increases haemoglobin levels. Best administered alongside B12.' },
    { name: 'Vitamin E + Selenium', dose: '1g powder per Litre of water', timing: 'Thursday', benefits: 'Acts as a cellular antioxidant, prevents muscle cramps and fatigue during flight.' },
    { name: 'Probiotics', dose: '5g powder per kg feed (dampened)', timing: 'Saturday & Sunday', benefits: 'Maintains gut pH and beneficial microflora, preventing E. coli and Coccidiosis outbreaks.' },
    { name: 'Electrolytes', dose: '10g per Litre of water', timing: 'Saturday & Thursday', benefits: 'Restores electrolyte balance, prevents dehydration during hot days.' },
    { name: 'Amino Acids', dose: '10ml per Litre of water', timing: 'Monday & Tuesday', benefits: 'Speeds up muscle regeneration and weight recovery post-flight.' },
    { name: 'Grit & Clay Minerals', dose: 'Free access (ad libitum)', timing: 'Available 24/7 (replace daily)', benefits: 'Provides calcium for skeleton/eggs, grit acts as grinding stones in gizzard.' },
    { name: 'Liver Support (Sorbitol/B-complex)', dose: '5ml per Litre of water', timing: 'Sunday', benefits: 'Helps detoxify the liver and kidneys of metabolic waste after intense flight.' }
  ]

  return (
    <div 
      className="modal-backdrop modal-floating" 
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ zIndex: 9000 }}
    >
      <div
        className="modal-container"
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: '680px', width: '95%', maxHeight: '90dvh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #10b981, #047857)', flexShrink: 0 }}>
          <div className="modal-header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🕊️</span>
            <div>
              <h2 className="modal-title" style={{ color: '#fff', fontWeight: 800 }}>Pigeon Training & Conditioning</h2>
              <p className="modal-subtitle" style={{ color: 'rgba(255,255,255,0.75)' }}>Belgian & Taiwanese championship training methodology</p>
            </div>
          </div>
          <button 
            className="modal-close-btn" 
            style={{ color: '#fff', background: 'rgba(255,255,255,0.1)' }} 
            onClick={onClose} 
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div 
          className="small-scrollbar"
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-default)',
            background: 'rgba(255,255,255,0.01)',
            overflowX: 'auto',
            width: '100%',
            flexShrink: 0
          }}
        >
          {(['schedule', 'progression', 'feeding', 'recovery', 'supplements'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.88rem 1.1rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: 'none',
                background: 'transparent',
                color: activeTab === tab ? '#10b981' : 'var(--text-secondary)',
                borderBottom: activeTab === tab ? '2px solid #10b981' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                flexShrink: 0
              }}
            >
              {tab === 'schedule' && '📅 Weekly Schedule'}
              {tab === 'progression' && '📈 Toss Progression'}
              {tab === 'feeding' && '🌾 Feed Calc'}
              {tab === 'recovery' && '🏥 Recovery'}
              {tab === 'supplements' && '🧪 Supplements'}
            </button>
          ))}
        </div>

        {/* Modal Content Body */}
        <div className="modal-body" style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* TAB 1: WEEKLY CONDITIONING SCHEDULE */}
          {activeTab === 'schedule' && (
            <div>
              {/* Return Day Selector */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                padding: '0.65rem 0.88rem',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-default)',
                borderRadius: '0.625rem',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  📅 Race Return Day (Araw ng Uwi):
                </span>
                <select
                  aria-label="Race Return Day"
                  value={returnDay}
                  onChange={(e) => {
                    const newDay = e.target.value as DayType
                    setReturnDay(newDay)
                    setActiveDay(newDay) // auto select the new return day
                  }}
                  style={{
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-default)',
                    padding: '0.35rem 0.6rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <option value="sun">Sunday (Linggo)</option>
                  <option value="mon">Monday (Lunes)</option>
                  <option value="tue">Tuesday (Martes)</option>
                  <option value="wed">Wednesday (Miyerkules)</option>
                  <option value="thu">Thursday (Huwebes)</option>
                  <option value="fri">Friday (Biyernes)</option>
                  <option value="sat">Saturday (Sabado)</option>
                </select>
              </div>

              {/* Day selection badges */}
              <div 
                className="small-scrollbar"
                style={{
                  display: 'flex',
                  gap: '0.35rem',
                  marginBottom: '1rem',
                  background: 'rgba(255,255,255,0.02)',
                  padding: '0.3rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-default)',
                  overflowX: 'auto',
                  width: '100%'
                }}
              >
                {getOrderedDays().map((day) => (
                  <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    style={{
                      padding: '0.45rem 0.25rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: activeDay === day ? '#10b981' : 'transparent',
                      color: activeDay === day ? '#000' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease',
                      textAlign: 'center',
                      flex: '1 0 55px',
                      minWidth: '55px'
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', marginBottom: '0.1rem' }}>{daysInfo[day].icon}</div>
                    <div>{day.toUpperCase()}</div>
                  </button>
                ))}
              </div>

              {/* Day Detail Card */}
              <div style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--border-default)',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      {daysInfo[activeDay].icon} {daysInfo[activeDay].title} Schedule
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>{daysInfo[activeDay].subtitle}</span>
                  </div>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--brand-gold)',
                    background: 'rgba(255, 193, 7, 0.08)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 193, 7, 0.2)'
                  }}>
                    Focus: Conditioning
                  </span>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>Daily Focus</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {daysInfo[activeDay].focus}
                  </p>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>Task Checklist</h4>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: 0, listStyle: 'none', margin: 0 }}>
                    {daysInfo[activeDay].schedule.map((task, idx) => {
                      const id = `sched-${activeDay}-${idx}`
                      return (
                        <li 
                          key={idx}
                          onClick={() => toggleStep(id)}
                          style={{
                            fontSize: '0.8rem',
                            color: completedSteps[id] ? 'var(--text-muted)' : 'var(--text-primary)',
                            textDecoration: completedSteps[id] ? 'line-through' : 'none',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.5rem',
                            cursor: 'pointer',
                            padding: '0.35rem 0.5rem',
                            background: completedSteps[id] ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--border-default)',
                            borderRadius: '0.375rem',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{ color: completedSteps[id] ? '#10b981' : 'var(--text-secondary)', fontWeight: 'bold' }}>
                            {completedSteps[id] ? '✓' : '☐'}
                          </span>
                          <span>{task}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                <div className="responsive-grid-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem', letterSpacing: '0.04em' }}>🌾 Feeding</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>{daysInfo[activeDay].feeding}</p>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem', letterSpacing: '0.04em' }}>🧪 Supplements</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>{daysInfo[activeDay].supplements}</p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: TOSS PROGRESSION */}
          {activeTab === 'progression' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.4',
                background: 'rgba(16, 185, 129, 0.04)',
                border: '1px solid rgba(16, 185, 129, 0.15)',
                borderRadius: '0.5rem',
                padding: '0.65rem 0.88rem'
              }}>
                📈 <strong>Training Toss Progression</strong>: Complete each stage before advancing. If pigeons arrive dispersed or delayed, repeat the stage before increasing distance.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {progressionSteps.map((step) => (
                  <div
                    key={step.id}
                    onClick={() => toggleStep(step.id)}
                    style={{
                      background: completedSteps[step.id] ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '0.625rem',
                      padding: '0.75rem 1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      transition: 'all 0.15s ease',
                      opacity: completedSteps[step.id] ? 0.65 : 1
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                      <span style={{
                        color: completedSteps[step.id] ? '#10b981' : 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '0.5rem',
                        background: completedSteps[step.id] ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.03)',
                        border: completedSteps[step.id] ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border-default)',
                        flexShrink: 0,
                        fontWeight: 'bold'
                      }}>
                        {completedSteps[step.id] ? '✓' : '☐'}
                      </span>
                      
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.1rem' }}>
                          {step.stage}: {step.distance}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          🔁 {step.frequency} · <span style={{ color: 'var(--text-muted)' }}>{step.notes}</span>
                        </div>
                      </div>
                    </div>
                    
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      color: completedSteps[step.id] ? '#10b981' : 'var(--brand-gold)',
                      background: completedSteps[step.id] ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 193, 7, 0.05)',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap'
                    }}>
                      {completedSteps[step.id] ? 'COMPLETED' : 'PENDING'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: FEEDING CALCULATOR */}
          {activeTab === 'feeding' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Distance selectors */}
              <div className="responsive-btn-group">
                <button
                  type="button"
                  onClick={() => setActiveDistance('short')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    border: '1px solid var(--border-default)',
                    background: activeDistance === 'short' ? '#10b981' : 'rgba(255,255,255,0.02)',
                    color: activeDistance === 'short' ? '#000' : 'var(--text-primary)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  🌾 Short Distance (90-150 km)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDistance('medium')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    border: '1px solid var(--border-default)',
                    background: activeDistance === 'medium' ? '#10b981' : 'rgba(255,255,255,0.02)',
                    color: activeDistance === 'medium' ? '#000' : 'var(--text-primary)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  🥜 Medium Distance (150-300 km)
                </button>
              </div>

              {/* Feed Breakdown Panel */}
              <div style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--border-default)',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    {feedingBreakdown[activeDistance].title} ({feedingBreakdown[activeDistance].range})
                  </h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                    Fat loading schedule starts: <strong style={{ color: '#10b981' }}>{feedingBreakdown[activeDistance].fatStart}</strong>
                  </p>
                </div>

                {/* Percentage Progress Bars */}
                <div>
                  <h4 style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.6rem', letterSpacing: '0.04em' }}>Nutritional Component Targets</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {/* Carbohydrates */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Carbohydrates (Base Glycogen Energy)</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{feedingBreakdown[activeDistance].carboPercent}%</strong>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: '#58a6ff', width: `${feedingBreakdown[activeDistance].carboPercent}%` }} />
                      </div>
                    </div>
                    {/* Fats */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Lipids / Fats (Long Flight Stamina)</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{feedingBreakdown[activeDistance].fatPercent}%</strong>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'var(--brand-gold)', width: `${feedingBreakdown[activeDistance].fatPercent}%` }} />
                      </div>
                    </div>
                    {/* Protein */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Protein (Muscle Rebuilding)</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{feedingBreakdown[activeDistance].proteinPercent}%</strong>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: '#a371f7', width: `${feedingBreakdown[activeDistance].proteinPercent}%` }} />
                      </div>
                    </div>
                    {/* Depurative */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Depurative / Diet (Detoxification)</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{feedingBreakdown[activeDistance].depurativePercent}%</strong>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: '#3fb950', width: `${feedingBreakdown[activeDistance].depurativePercent}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table Breakdown */}
                <div>
                  <h4 style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>Suggested Ratio Mixture</h4>
                  <div className="responsive-table-container">
                    <table style={{ width: '100%', minWidth: '400px', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '0.4rem 0.25rem' }}>Grain Group</th>
                          <th style={{ padding: '0.4rem 0.25rem' }}>Ratio</th>
                          <th style={{ padding: '0.4rem 0.25rem' }}>Biological Purpose</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feedingBreakdown[activeDistance].feedBreakdownTable.map((row, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '0.5rem 0.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{row.item}</td>
                            <td style={{ padding: '0.5rem 0.25rem', color: '#10b981', fontWeight: 800 }}>{row.ratio}</td>
                            <td style={{ padding: '0.5rem 0.25rem', color: 'var(--text-secondary)' }}>{row.role}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Guidelines */}
                <div>
                  <h4 style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.35rem', letterSpacing: '0.04em' }}>Feeding Guidelines</h4>
                  <ul style={{ paddingLeft: '1rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {feedingBreakdown[activeDistance].guidelines.map((g, idx) => (
                      <li key={idx}>{g}</li>
                    ))}
                  </ul>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: RECOVERY PROTOCOL */}
          {activeTab === 'recovery' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.4',
                background: 'rgba(255, 143, 0, 0.04)',
                border: '1px solid rgba(255, 143, 0, 0.15)',
                borderRadius: '0.5rem',
                padding: '0.65rem 0.88rem'
              }}>
                🚨 <strong>Recovery is key</strong>: Races are won or lost based on how fast the loft recovers. Follow these time-sensitive protocols after birds return to the loft.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {recoveryItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleStep(item.id)}
                    style={{
                      background: completedSteps[item.id] ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '0.625rem',
                      padding: '0.8rem 1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      transition: 'all 0.15s ease',
                      opacity: completedSteps[item.id] ? 0.65 : 1
                    }}
                  >
                    <span style={{
                      color: completedSteps[item.id] ? '#10b981' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '1.8rem',
                      height: '1.8rem',
                      borderRadius: '0.5rem',
                      background: completedSteps[item.id] ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.03)',
                      border: completedSteps[item.id] ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border-default)',
                      flexShrink: 0,
                      fontWeight: 'bold',
                      marginTop: '0.1rem'
                    }}>
                      {completedSteps[item.id] ? '✓' : '☐'}
                    </span>
                    
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>
                          {item.phase}
                        </span>
                        {completedSteps[item.id] && (
                          <span style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 700 }}>VERIFIED</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.15rem 0' }}>
                        {item.title}
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.35' }}>
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: SUPPLEMENTS GUIDE */}
          {activeTab === 'supplements' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              
              <div className="responsive-grid-2">
                {supplementsList.map((sup, index) => (
                  <div
                    key={index}
                    style={{
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '0.625rem',
                      padding: '0.88rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      transition: 'border-color 0.15s ease'
                    }}
                    className="selection-item-card"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--brand-gold)' }}>🧪 {sup.name}</strong>
                      <span style={{
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        color: '#10b981',
                        background: 'rgba(16, 185, 129, 0.08)',
                        padding: '0.15rem 0.35rem',
                        borderRadius: '4px'
                      }}>
                        {sup.timing}
                      </span>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dosage</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-primary)' }}>{sup.dose}</span>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Biological Benefits</span>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.3' }}>{sup.benefits}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{
          padding: '0.88rem 1.25rem',
          borderTop: '1px solid var(--border-default)',
          background: 'rgba(255,255,255,0.01)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            FlyMetric Pigeon Guide v1.0 • Established Loft Standards
          </span>
          <button
            type="button"
            className="nav-btn nav-btn-primary"
            onClick={onClose}
            style={{
              padding: '0.45rem 1rem',
              background: '#10b981',
              color: '#000',
              fontWeight: 800,
              fontSize: '0.75rem',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '1.8rem'
            }}
          >
            Close Guide
          </button>
        </div>

      </div>
    </div>
  )
}
