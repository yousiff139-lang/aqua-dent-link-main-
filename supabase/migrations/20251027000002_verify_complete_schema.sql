-- ============================================================================
-- COMPLETE SCHEMA VERIFICATION AND FIX
-- Task 1: Verify and fix database schema
-- This migration ensures all required tables, columns, indexes, and RLS policies exist
-- ============================================================================

-- ============================================================================
-- PART 1: VERIFY AND FIX APPOINTMENTS TABLE
-- ============================================================================

-- Ensure appointments table exists
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dentist_id UUID,
    dentist_email TEXT,
    patient_name TEXT NOT NULL,
    patient_email TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('pending', 'confirmed', 'upcoming', 'completed', 'cancelled')),
    payment_method TEXT CHECK (payment_method IN ('stripe', 'cash')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    chief_complaint TEXT,
    symptoms TEXT,
    medical_history TEXT,
    smoking BOOLEAN DEFAULT FALSE,
    medications TEXT,
    allergies TEXT,
    previous_dental_work TEXT,
    cause_identified BOOLEAN DEFAULT TRUE,
    uncertainty_note TEXT,
    patient_notes TEXT,
    dentist_notes TEXT,
    stripe_session_id TEXT,
    stripe_payment_intent_id TEXT,
    pdf_report_url TEXT,
    booking_reference TEXT,
    conversation_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 2: VERIFY AND FIX DENTISTS TABLE
-- ============================================================================

-- Ensure dentists table exists with all required columns
CREATE TABLE IF NOT EXISTS public.dentists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    specialization TEXT,
    rating DECIMAL(3,2) DEFAULT 0.0,
    experience_years INTEGER DEFAULT 0,
    phone TEXT,
    address TEXT,
    bio TEXT,
    education TEXT,
    expertise TEXT[],
    image_url TEXT,
    available_times JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 3: CREATE PERFOR;

END $ed'; fixandd ema verifiebase schlete: Dataask 1 Comp '📊 TCEOTI RAISE N';
   OTICE 'ISE NED';
    RAFIGURers: CONE '✅ TriggIC NOT    RAISEED';
: CREATce IndexesmanerforCE '✅ PE NOTI
    RAISONFIGURED'; C Policies:LS NOTICE '✅ R
    RAISEOTICE '';   RAISE N   
 
 ND IF; E
   ING'; table: MISSntistsE '❌ DeRAISE NOTIC         ELSE

   url';, image_tisen, experatiobio, educ, rating, onlizatiia specil, name, emalds: id,quired fie- Re '   TICE    RAISE NO
    ABLED';- RLS: ENCE '   ISE NOTI        RA_indexes;
tists denndexes: %', ICE '   -AISE NOTI    Rs;
    ts_columntisen, dolumns: %'- CE '    RAISE NOTIC  TS';
     le: EXIStabentists NOTICE '✅ D     RAISE    HEN
ts Tists_exntis de    
    IF'';
OTICE  RAISE N 
    IF;
     ENDSSING';
  able: MIintments tCE '❌ Appo  RAISE NOTIELSE
      ';
    tripe, cash ss:yment method- PaTICE '   ISE NO       RAlled';
 , canceeted, complngupcomionfirmed,  cending,t: pinonstraStatus c- E '   TIC  RAISE NO    
  LED';LS: ENABTICE '   - R RAISE NO
       nts_indexes;ppointme aexes: %',- IndTICE '    NOISE   RA    lumns;
 ts_copointmenumns: %', ap- ColNOTICE '    RAISE S';
       : EXISTts tableintmen✅ Appo NOTICE 'RAISE
        ts THENtments_exisIF appoin
    
    '; 'OTICE   RAISE N
 ═╝';═══════════════════════════════════════════════════E '╚════════IC  RAISE NOT';
            ║       ETE         ON COMPLTIIFICAA VERHEM'║     SCNOTICE  RAISE ═══╗';
   ═══════════════════════════════════════════════════════'╔══E AISE NOTICults
    Rport res
    -- Rec';
    bli'pu = ameD scheman
    ANsts''dentiablename = WHERE ts
    ndexe   FROM pg_i
 _indexesistsntTO deOUNT(*) IN SELECT C   ';
    
 = 'publicemanamech'
    AND sintments= 'appoename WHERE tabl   indexes
 ROM pg_es
    F_indexppointments aNT(*) INTOELECT COU
    Sndexes -- Count i
   ic';
    hema = 'publtable_scAND 
    tists' me = 'denable_naERE t  WHumns 
  coln_schema. informatioROMmns
    Fcoluentists_INTO dT COUNT(*)   SELEC
  ';
    publica = 'hemtable_scD   AN
  ments'  = 'appointle_nametab   WHERE olumns 
 a.cation_schem informFROM   umns
 ts_colpointmen*) INTO apLECT COUNT(    SEmns
lut cooun  -- Cs;
    
  s_existINTO dentist   ) '
 publicma = 'D table_scheAN 
        ntists'ame = 'dele_n   WHERE tab 
     blestachema.formation_s FROM inSELECT 1
        STS ( SELECT EXI  
   sts;
  s_eximentO appoint   ) INTpublic'
  = 'mache AND table_s       
 pointments'me = 'apable_naE t       WHER.tables 
 schemaormation_T 1 FROM infSELEC      TS (
  XIS   SELECT E
 tables exist if   -- Check  
BEGINger;
intes_indexes ist    dent integer;
_indexesntments  appoi;
  ntegers_columns ist;
    dentiegerints columnointments_
    apps boolean;_exist    dentistsan;
sts booleexitments_oinapp
    
DECLARE $DO=====

==================================================================NG
-- ===== AND REPORTIIONFICAT7: VERI==
-- PART ==========================================================================();

-- ed_at_columnte_updatN updaFUNCTIOE ROW EXECUT EACH OR
Fistsentic.dE ON publ UPDAT
BEFOREdated_at dentists_upGER update_ATE TRIGRE

Ct_column();d_aate_updON updateFUNCTIW EXECUTE  EACH ROntments
FORic.appoiN publPDATE OE U
BEFOR_at ents_updatedpointme_apER updatTE TRIGGREAiggers
Ced_at trd updat-- Adts;

tisic.denON publpdated_at s_uate_dentistTS updGGER IF EXIS
DROP TRIntments;ic.appoiN publpdated_at Opointments_uTS update_apXISTRIGGER IF E
DROP esuplicatvoid dgers to asting trigDrop exi

-- ql';age 'plpgs languND;
$ NEW;
E RETURNOW();
   dated_at = N NEW.up
BEGIN
    $GER AS TRIG)
RETURNSumn(cold_at_updatee_ON updatNCTIR REPLACE FUE Ost
CREAT exi doesn'tction if it trigger funpdated_at- Create u

-===================================================================- ========= TRIGGERS
- UPDATEATE ORPART 6: CRE
-- =====================================================================- =======ated;

-thentictists TO audenlic. pubATE ON UPDnon;
GRANTticated, aenauthists TO public.dent ON  SELECTRANTTO anon;
Gtments appoinT ON public.
GRANT SELEChenticated;ut TO aentsppointmblic.a ON puDATE, DELETE, INSERT, UPNT SELECT=====

GRA=======================================================================- MISSIONS
-ERT P 5: GRAN
-- PART============================================================================  );

--    )

 dmin'e = 'aoles.roler_r   AND us
   ().uider_id = authroles.usE user_     WHERser_roles
 lic.uFROM pub 1 SELECT    ISTS (
  
    EXd
  USING (authenticate
  TO LLR Ats FOdentisc.liubON p
  sts" dentiagen man cans"AdmiICY CREATE POL;

  ).id
    )
dentistsist_id = s.dentleer_ro  AND us   tist'
 'denrole =  user_roles.)
      ANDuth.uid(er_id = as.usE user_role    WHERer_roles
  public.usCT 1 FROM SELE      STS (

    EXI (USINGticated
  hen TO autOR UPDATE
 s Fic.dentist
  ON publprofile"wn update ots can Y "DentisPOLIC
CREATE NG (true);
n
  USIcated, anoO authentiSELECT
  Tentists FOR blic.ds"
  ON puview dentistne can  "AnyoE POLICYes
CREATRLS Policintists De
-- ntists;
 public.de" ONistse dentanag can mins"AdmSTS  EXILICY IF;
DROP POistsublic.dent pofile" ONe own prcan updat"Dentists EXISTS IF P POLICY ists;
DROentpublic.dtists" ON can view denic PublSTS "ICY IF EXIDROP POLists;
public.denttists" ON  view denanS "Anyone cCY IF EXIST POLIROPs
Dists policieisting dentex-- Drop ;

  )
    )
 'admin's.role =er_role AND us)
     auth.uid(_id = sers.uer_role WHERE uss
     ic.user_rolepubl1 FROM     SELECT EXISTS (
  SING (
    
  UticatedTO authenFOR ALL
  ointments appic."
  ON publntmentsppoil aan manage al"Admins cLICY ATE PO

CRE;)
  )min'
    e = 'ades.rolAND user_rol    uid()
   = auth.es.user_id user_rolERE
      WH_rolesserROM public.uLECT 1 F
      SE EXISTS (USING (
   cated
  uthenti TO aCT
 s FOR SELEointmentappublic. p
  ON"mentsointappl  can view alinsPOLICY "Adm

CREATE   )
  );_id
  .dentisttments= appointist_id den_roles.user      AND t'
isrole = 'dentes.ND user_rol Ad()
     .uithau_id = _roles.usererRE usWHEles
      er_roOM public.usFRT 1  SELECSTS (
      EXI )
    ORemail
   tist_denppointments.l = aers.emaith.us AND auid()
     d = auth.users.ih.uut WHERE a  users
   uth.T 1 FROM aLEC     SESTS (
   OR EXId 
  t_i= dentisuth.uid()  a(
   
  USING enticatedE
  TO authPDATts FOR UppointmenON public.atments"
  ir appoinheate tcan updts  "DentisE POLICY);

CREAT
     )id
 tist_nts.denmeappoint = entist_id_roles.duserND      At'
 'dentisrole =  user_roles.     ANDuth.uid()
  = aer_id.usolesWHERE user_roles
      lic.user_rM pubELECT 1 FRO    S  EXISTS (
R   )
    Omail
  .dentist_epointmentsl = apusers.emai   AND auth.  uth.uid()
 d = a.irs.useth  WHERE au   
 rsauth.useOM  1 FRELECT  S
    EXISTS (R 
    Ot_id dentish.uid() = ut  aG (
  ted
  USINhenticaautCT
  TO ts FOR SELEenintmc.appobli ON puments"
 ir appointn view thetists ca"DenICY TE POL
CREAmpleted');
 'co!=ND status d A= patient_i() uidSING (auth.
  Uenticateduth
  TO aDELETER  FOappointmentsblic.pu
  ON s"ointmentte own appeles can dient"PatCY 
CREATE POLId);
 = patient_id()ECK (auth.uiTH CH
  WI patient_id)d() =G (auth.uiUSINnticated
  
  TO authe FOR UPDATEmentslic.appointpubnts"
  ON pointme ap update own canatients"PTE POLICY REA);

C= patient_idid()  (auth.uCHECK  WITH ted
icant authe TOOR INSERT
 ents Fpointmc.ap ON publiments"
 ntappoin create s catientICY "PaATE POLCRE;

ent_id)uid() = patih.USING (autted
  uthentica a
  TOSELECTtments FOR .appoinON publicts"
  tmenn appoinn view ows caientLICY "PatPOCREATE 
liciesents RLS PoAppointments;

-- intmlic.appo pub" ONppointmentsmanage all an dmins caSTS "AIF EXIDROP POLICY intments;
 public.appoents" ONintmew all appos can viAdminTS "F EXISOLICY I
DROP Pointments;public.app" ON entseir appointmthte  can updatists"DenF EXISTS  POLICY Iments;
DROPntic.appoiON publents" pointmw their apvieentists can STS "DOLICY IF EXI
DROP Ps;mentntc.appoiON publits" men appoint delete ownents canXISTS "PatiPOLICY IF EP ents;
DROntmoilic.app pubments" ONown appoint update Patients canTS "XISIF E POLICY OPents;
DRtmic.appoin ON publtments"increate appos can  "PatientCY IF EXISTSPOLIents;
DROP ic.appointmts" ON publintmen appoowns can view entSTS "Pati IF EXIPOLICYROP onflicts
Davoid cto licies  existing po
-- DropURITY;
EVEL SECE ROW Ltists ENABLblic.denBLE puALTER TAURITY;
EL SEC LEVBLE ROWents ENAic.appointmpublE LTER TABL
Ah tablesn botle RLS o

-- Enab====================================================================- ========S
-LICIELS PO RCONFIGURET 4: =
-- PAR=======================================================================

-- ====OT NULL;ence IS Noking_refer) 
WHERE boencereferking_(bootsintmenic.appoblique 
ON pu_un_referencengkients_boox_appointmidEXISTS DEX IF NOT NIQUE IN UTEEAference
CRing reookfor bconstraint 
-- Unique C);
rating DES.dentists( publics_rating ONistSTS idx_dentXIOT EIF NX 
CREATE INDE);izationalecintists(spde ON public.ationaliz_speciidx_dentistsISTS NOT EXDEX IF EATE IN
CRil);dentists(emaN public.mail Oentists_edx_dISTS iNOT EXTE INDEX IF ndexes
CREAts table i
-- Dentisemail);
t_ntis(dementsintappolic.ubN ptist_email Ointments_denSTS idx_appo EXIIF NOTEATE INDEX e);
CR_referencookingts(benppointmN public.ance Ofere_rets_bookingntmendx_appoiOT EXISTS iNDEX IF NREATE Itus);
C(payment_statmentsc.appoinN publit_status Oymennts_pamedx_appointS iIF NOT EXISTX E INDE);
CREATs(statustmentppoinc.apublis_status ON entointmx_appSTS idEXIIF NOT DEX 
CREATE INte);ntment_dats(appoienpointm public.ap_date ONmentsx_appointidEXISTS EX IF NOT CREATE INDtist_id);
ntments(denblic.appoiist_id ON pudentppointments_TS idx_aNOT EXISNDEX IF CREATE Itient_id);
intments(pac.appo_id ON publipatientents_intmappoSTS idx_ IF NOT EXITE INDEXes
CREAle indexts tabmenntppoi
-- A=========
===================================================================XES
-- NDEMANCE I