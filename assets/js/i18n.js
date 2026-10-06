/*
 * Locus Mirabilis — narrative content.
 *
 * Every user-facing string lives here so the story can be edited without
 * touching the controller. Keys must exist in both languages (enforced by
 * tests/unit/i18n.test.js). Placeholders use {name} and are filled by
 * LM.t(key, vars) in app.js. "[[secret]]" tokens inside dossier rows become
 * redacted, hover-to-glimpse fields.
 */
/* global module */
(function () {
  'use strict';

  const TR = {
    htmlLang: 'tr',
    pageTitle: 'GÖZETİM ALTINDASIN',
    pageTitleAway: 'GERİ DÖN.',
    languageButton: 'DİL: TR',
    languageAria: 'Dili değiştir (şu an Türkçe)',

    /* status bar */
    rec: 'KAYIT',
    recAria: 'Bu oturum kaydediliyor',
    citizenLabel: 'VATANDAŞ',
    visitLabel: 'ZİYARET',
    statusLabel: 'DURUM',
    statusPending: 'BEKLEMEDE',
    statusLoyal: 'ONAYLI',
    statusSuspect: 'ŞÜPHELİ',
    clockAria: 'Saat. Daima on üç.',
    buildLabel: 'DERLEME',
    buildApproved: 'BAKANLIK ONAYLI',

    /* boot */
    bootLines: [
      'TELEKRAN v13.0 — BAĞLANTI KURULUYOR',
      'HAT GÜVENLİ DEĞİL. HAT HİÇBİR ZAMAN GÜVENLİ DEĞİLDİ.',
      'VATANDAŞ TANIMLANIYOR... {id}',
      '{visitLine}',
      'SAAT ON ÜÇÜ VURUYOR.',
      'GÖZETİM ALTINDASIN'
    ],
    bootFirstVisit: 'İLK ZİYARET. DOSYA AÇILDI.',
    bootReturn: 'ZİYARET {visits}. GİTMEDİĞİNİZİ BİLİYORDUK.',
    bootSkip: 'ATLAMAK İÇİN BİR TUŞA BASIN. ATLADIĞINIZ KAYDEDİLİR.',

    /* main screen */
    hint: 'KOMUT İPUCU: YARDIM, BILGI, BILET, IZIN, CIKIS',
    tapHint: 'Yazmak için ekrana dokunun.',
    historyTitle: 'SON KOMUTLAR',
    emptyHistory: 'Henüz komut girilmedi. Bu da kaydedildi.',
    volumeLabel: 'SES',
    volumeAria: 'Ses seviyesi',
    muteLabel: 'SESSİZ',
    muteOn: 'AÇIK',
    muteOff: 'KAPALI',

    /* help */
    helpPrefix: 'MEVCUT KOMUTLAR:',
    helpCommands: 'YARDIM, BILGI, BILET, IZIN, CIKIS, IZ',
    helpSuffix: '— LİSTELENMEYEN KOMUTLAR DA MEVCUTTUR.',

    /* bureaucratic processing before a panel opens */
    processing: [
      ['TALEP ALINDI', "BİRİM 4'E İLETİLDİ", 'BİRİM 4 YANIT VERMİYOR', 'ONAYLANDI'],
      ['YETKİ KONTROL EDİLİYOR', 'YETKİ BULUNAMADI', 'YETKİ YİNE DE VERİLDİ', 'ERİŞİM AÇILIYOR'],
      ['KİMLİK DOĞRULANIYOR', 'KİMLİĞİNİZ ZATEN BİLİNİYORDU', 'DOSYA GETİRİLİYOR']
    ],

    /* dossier */
    dossierTitle: '[ DOSYA_734 ERİŞİM SAĞLANDI ]',
    dossierStamp: 'GİZLİ',
    dossierRows: [
      { k: 'PROJE:', v: 'Locus Mirabilis.' },
      { k: 'AMAÇ:', v: 'Toplumsal uyum ve istikrarın sağlanması.' },
      { k: 'MEVCUT DURUM:', v: 'Faz 3 aktif. Vatandaşların katılımı zorunludur.' },
      { k: 'YER:', v: '[[venue]]' },
      { k: 'TARİH:', v: '[[date]]' },
      { k: 'SAAT:', v: '[[time]]' },
      { k: '', v: 'Gerçeklik yeniden tanımlanacak. Sorgulama.' }
    ],
    secrets: {
      venue: { text: '████████████ Tiyatrosu', reveal: '[KAYNAKTA SİLİNMİŞ] Tiyatrosu' },
      date: { text: 'HER GÜN' },
      time: { text: '20:00' }
    },
    redactedAria: 'Gizli bilgi. Bir an için görmek için etkinleştirin.',
    redactedSr: '[gizli]',
    redactSeen: 'BUNU GÖRMEDİNİZ.',
    redactUnlocked: 'SEVİYE 2 ERİŞİM: KARARTMALAR KALDIRILDI.',
    subjectTitle: 'EK-A: DENEK KAYDI',
    subjectRows: {
      subject: 'DENEK',
      visits: 'ZİYARET',
      localTime: 'YEREL SAAT',
      zone: 'BÖLGE',
      screen: 'EKRAN',
      input: 'GİRİŞ',
      language: 'DİL',
      loyalty: 'SADAKAT',
      registration: 'KAYIT',
      room: 'ODA 101'
    },
    inputMouse: 'FARE',
    inputTouch: 'DOKUNMATİK',
    none: 'YOK',
    roomNotVisited: 'ZİYARET EDİLMEDİ',
    roomVisited: 'ZİYARET EDİLDİ',
    subjectNote: 'Bu veriler tarayıcınızdan ayrılmaz. Buna inanmanız beklenmektedir.',
    accessTimer: 'ERİŞİM SÜRESİ',
    accessExpired: 'ERİŞİM SÜRESİ DOLDU.',

    /* permit */
    ticketTitle: '[ ERİŞİM İZNİ_217 ]',
    ticketStamp: 'ZORUNLU',
    ticketDescription: "Vatandaş katılımı, rejimin devamlılığı için esastır. Kaydınız, sisteme olan sadakatinizin bir göstergesidir. İzinsiz varlıklar tespit edilecek ve arındırılacaktır. Katılımınızı onaylayarak, Locus Mirabilis'in kurallarını ve gerçekliğini kabul etmiş olursunuz.",
    formNoLabel: 'FORM NO',
    formNo: '217/13-Δ',
    regName: 'KOD ADI',
    regContact: 'İLETİŞİM KANALI',
    regConsent: "Locus Mirabilis'in kurallarını ve gerçekliğini kabul ediyorum.",
    regSubmit: '[ KAYDI TAMAMLA ]',
    regError: 'Geçerli bir kod adı ve iletişim kanalı girin.',
    regConsentError: 'Gerçekliği kabul etmeden devam edemezsiniz.',
    regSteps: ['BAŞVURU ALINDI', "BİRİM 4'E İLETİLDİ", 'BİRİM 4 MEVCUT DEĞİL', 'BİRİM 7 ONAYLADI', 'ONAY İPTAL EDİLDİ', 'ONAY YENİDEN VERİLDİ'],
    regSuccess: 'KAYIT ALINDI. KAYIT NO: {code}. SİSTEM SİZİ İZLİYOR.',
    regAlready: 'ZATEN KAYITLISINIZ, {id}. KAYIT NO: {code}. İKİ KEZ KAYIT OLMAK DA KAYDEDİLDİ.',
    receiptTitle: 'MAKBUZ',
    receiptCode: 'KAYIT NO',
    receiptSubject: 'DENEK',
    receiptTime: 'ZAMAN',
    receiptNote: 'Bu makbuz hiçbir hak doğurmaz. Saklayınız.',
    privacyNote: 'Veriler tarayıcınızdan çıkmaz. Hiçbir yere gönderilmez. Buna inanmanız beklenmektedir.',
    registeredPrefix: 'KAYIT',
    exitPrompt: "> Çıkmak için 'CIKIS' yazın veya ESC tuşuna basın.",

    /* responses */
    invalid: ['GEÇERSİZ KOMUT', 'GEÇERSİZ KOMUT. KAYDEDİLDİ.', 'HATALARINIZ BİRİKİYOR, {id}.'],
    suspectFlag: 'DURUM GÜNCELLENDİ: ŞÜPHELİ',
    corrected: "'{raw}' → '{cmd}' OLARAK DÜZELTİLDİ. NE DEMEK İSTEDİĞİNİZİ BİLİYORUZ.",
    noExit: 'ÇIKIŞ YOK.',
    clueMessage: 'İPUCU: TRUST veya RESIST',
    trustMessage: 'SİSTEM SENİ ONAYLADI. SEVİYE 2 ERİŞİM VERİLDİ.',
    resistMessage: 'DİRENİŞ KAYDEDİLDİ. DOSYANIZ İŞARETLENDİ.',
    room101: ['ODA 101 AÇILIYOR.', 'ORADA EN ÇOK KORKTUĞUNUZ ŞEY VAR.', 'ZATEN BİLİYORSUNUZ.'],
    room101Locked: 'ODA 101 İÇİN ÖNCE BİR TARAF SEÇMELİSİNİZ.',
    whoami: "SİZ {id}'SİNİZ. BAŞKA KİM OLABİLİRDİNİZ Kİ?",
    time: 'SAAT ON ÜÇ.',
    why: 'SORU YOK.',
    no: "'HAYIR' TANIMLI BİR KOMUT DEĞİLDİR. HİÇBİR ZAMAN OLMADI.",
    yes: 'KAYDEDİLDİ.',
    appeal: 'İTİRAZINIZ İTİRAZ BÜROSUNA İLETİLDİ. İTİRAZ BÜROSU KAPALIDIR. HER ZAMAN KAPALIYDI.',
    twoPlusTwo: '2 + 2 = 5',
    year: 'O YIL HİÇ YAŞANMADI.',
    brother: 'SENİ İZLİYOR.',
    locus: 'HARİKA YER. HARİKA ZAMAN. HER ŞEY YOLUNDA.',
    forgetConfirm: "HAFIZANIZ SİLİNECEK. ONAYLAMAK İÇİN TEKRAR 'UNUT' YAZIN.",
    forgetDone: 'HAFIZANIZ SİLİNDİ. BİZİMKİ SİLİNMEDİ.',
    away: 'NEREDEYDİN?',
    awayLogged: 'AYRILMA KAYDEDİLDİ.',
    idle: ['BURADA MISIN?', 'NEDEN BEKLİYORSUN?', 'YAZ.', 'SENİ GÖRÜYORUZ.', 'NE DÜŞÜNDÜĞÜNÜ BİLİYORUZ.'],

    /* notices */
    noticeLabel: 'DUYURU',
    noticeClose: 'Duyuruyu kapat',
    notices: [
      'Bu oturum kaydedilmektedir. Rızanız alınmıştır.',
      'Tuş vuruş örüntünüz incelendi. Sonuç: normal. Şimdilik.',
      'Bir komşunuz sizi bildirdi. Teşekkürler, komşunuz.',
      'Dosyanız güncellendi. Değişiklik yapılmadı.',
      'Lütfen ekrana bakmaya devam edin.',
      'Şu an hissettiğiniz şeyin bir adı yoktur. Verilmeyecektir de.',
      'Sorunuz alındı. Sorunuz yoktu.'
    ],

    /* ticker */
    tickerAria: 'Bakanlık duyuruları',
    ticker: [
      'ÜRETİM HEDEFLERİ %112 ORANINDA AŞILMIŞTIR',
      'ÇİKOLATA TAYINI 30 GRAMA YÜKSELTİLMİŞTİR (ÖNCEKİ: 35 GRAM)',
      'BUGÜN HİÇBİR ŞEY OLMADI',
      'GÖZETİM, GÜVENLİĞİNİZ İÇİNDİR',
      'DÜŞÜNMEK ZORUNDA DEĞİLSİNİZ · SİZİN İÇİN DÜŞÜNDÜK',
      'LOCUS MIRABILIS · GERÇEKLİK YENİDEN TANIMLANIYOR · KATILIM ZORUNLUDUR',
      'KAYIP VATANDAŞ SAYISI: 0 · HİÇ KİMSE KAYIP DEĞİLDİR',
      'SAVAŞ BARIŞTIR · ÖZGÜRLÜK KÖLELİKTİR · CEHALET GÜÇTÜR',
      'SAAT ON ÜÇÜ VURDU · SAAT HER ZAMAN ON ÜÇÜ VURUR'
    ],
    tickerSuspect: 'ŞÜPHELİ VATANDAŞ TESPİT EDİLDİ: {id} · KOMŞULARI BİLGİLENDİRİLDİ',
    tickerLoyal: 'ÖRNEK VATANDAŞ: {id} · SADAKATİ ONAYLANDI · ÖDÜL: HİÇBİR ŞEY',

    glitchPhrases: [
      'SENİ DUYUYORLAR', 'İTAAT ET', 'SORGU SUAL YOK', 'GERÇEK NEDİR?',
      'BÜYÜK BİRADER İZLİYOR', 'DÜŞÜNCE BİR SUÇTUR', 'SİSTEME GÜVEN',
      'YALNIZ DEĞİLSİN', 'HİÇ YALNIZ OLMADIN', 'KAPI KİLİTLİ DEĞİL. AMA AÇILMAZ.',
      'DOSYAN HAZIR', '2 + 2 = 5', 'ŞİMDİ BAKMA', 'ARKANA BAKMA'
    ],

    /* aria */
    ariaStatusBar: 'Durum çubuğu',
    ariaTopControls: 'Genel kontroller',
    ariaMain: 'Ana terminal ekranı',
    ariaAudio: 'Ses kontrolleri',
    ariaInfoPanel: 'Bilgi paneli: Dosya 734',
    ariaTicketPanel: 'Erişim izni paneli',
    ariaKeyboard: 'Ekran klavyesi',
    ariaAnnouncer: 'Sistem mesajları',
    keyEsc: 'Çıkış',
    keyDelete: 'Sil',
    keyEnter: 'Komutu çalıştır',
    keySuffix: 'tuşu'
  };

  const EN = {
    htmlLang: 'en',
    pageTitle: 'YOU ARE UNDER SURVEILLANCE',
    pageTitleAway: 'COME BACK.',
    languageButton: 'LANG: EN',
    languageAria: 'Switch language (currently English)',

    rec: 'REC',
    recAria: 'This session is being recorded',
    citizenLabel: 'CITIZEN',
    visitLabel: 'VISIT',
    statusLabel: 'STATUS',
    statusPending: 'PENDING',
    statusLoyal: 'CLEARED',
    statusSuspect: 'SUSPECT',
    clockAria: 'Clock. Always thirteen.',
    buildLabel: 'BUILD',
    buildApproved: 'MINISTRY APPROVED',

    bootLines: [
      'TELESCREEN v13.0 — ESTABLISHING LINK',
      'LINE NOT SECURE. THE LINE WAS NEVER SECURE.',
      'IDENTIFYING CITIZEN... {id}',
      '{visitLine}',
      'THE CLOCKS ARE STRIKING THIRTEEN.',
      'YOU ARE UNDER SURVEILLANCE'
    ],
    bootFirstVisit: 'FIRST VISIT. FILE OPENED.',
    bootReturn: 'VISIT {visits}. WE KNEW YOU NEVER LEFT.',
    bootSkip: 'PRESS ANY KEY TO SKIP. SKIPPING IS RECORDED.',

    hint: 'COMMAND HINT: HELP, INFO, TICKET, ACCESS, EXIT',
    tapHint: 'Tap the screen to type.',
    historyTitle: 'RECENT COMMANDS',
    emptyHistory: 'No commands yet. That has been noted too.',
    volumeLabel: 'VOL',
    volumeAria: 'Volume level',
    muteLabel: 'MUTE',
    muteOn: 'ON',
    muteOff: 'OFF',

    helpPrefix: 'AVAILABLE COMMANDS:',
    helpCommands: 'HELP, INFO, TICKET, ACCESS, EXIT, TRACE',
    helpSuffix: '— UNLISTED COMMANDS ALSO EXIST.',

    processing: [
      ['REQUEST RECEIVED', 'FORWARDED TO UNIT 4', 'UNIT 4 NOT RESPONDING', 'APPROVED'],
      ['CHECKING CLEARANCE', 'NO CLEARANCE FOUND', 'CLEARANCE GRANTED ANYWAY', 'OPENING ACCESS'],
      ['VERIFYING IDENTITY', 'YOUR IDENTITY WAS ALREADY KNOWN', 'RETRIEVING FILE']
    ],

    dossierTitle: '[ FILE_734 ACCESS GRANTED ]',
    dossierStamp: 'CLASSIFIED',
    dossierRows: [
      { k: 'PROJECT:', v: 'Locus Mirabilis.' },
      { k: 'PURPOSE:', v: 'Ensuring social conformity and stability.' },
      { k: 'CURRENT STATUS:', v: 'Phase 3 active. Citizen participation is mandatory.' },
      { k: 'LOCATION:', v: '[[venue]]' },
      { k: 'DATE:', v: '[[date]]' },
      { k: 'TIME:', v: '[[time]]' },
      { k: '', v: 'Reality will be redefined. Do not question.' }
    ],
    secrets: {
      venue: { text: '████████████ Theatre', reveal: '[REDACTED AT SOURCE] Theatre' },
      date: { text: 'EVERY DAY' },
      time: { text: '20:00' }
    },
    redactedAria: 'Redacted. Activate to glimpse it for a moment.',
    redactedSr: '[redacted]',
    redactSeen: 'YOU DID NOT SEE THAT.',
    redactUnlocked: 'LEVEL 2 ACCESS: REDACTIONS LIFTED.',
    subjectTitle: 'ANNEX A: SUBJECT RECORD',
    subjectRows: {
      subject: 'SUBJECT',
      visits: 'VISITS',
      localTime: 'LOCAL TIME',
      zone: 'ZONE',
      screen: 'SCREEN',
      input: 'INPUT',
      language: 'LANGUAGE',
      loyalty: 'LOYALTY',
      registration: 'REGISTRATION',
      room: 'ROOM 101'
    },
    inputMouse: 'MOUSE',
    inputTouch: 'TOUCH',
    none: 'NONE',
    roomNotVisited: 'NOT VISITED',
    roomVisited: 'VISITED',
    subjectNote: 'This data never leaves your browser. You are expected to believe that.',
    accessTimer: 'ACCESS WINDOW',
    accessExpired: 'ACCESS WINDOW EXPIRED.',

    ticketTitle: '[ ACCESS PERMIT_217 ]',
    ticketStamp: 'MANDATORY',
    ticketDescription: 'Citizen participation is essential for regime continuity. Your registration proves your loyalty to the system. Unauthorized entities will be detected and purified. By confirming participation, you accept the rules and reality of Locus Mirabilis.',
    formNoLabel: 'FORM NO',
    formNo: '217/13-Δ',
    regName: 'CODE NAME',
    regContact: 'CONTACT CHANNEL',
    regConsent: 'I accept the rules and the reality of Locus Mirabilis.',
    regSubmit: '[ COMPLETE REGISTRATION ]',
    regError: 'Provide a valid code name and contact channel.',
    regConsentError: 'You cannot proceed without accepting reality.',
    regSteps: ['APPLICATION RECEIVED', 'FORWARDED TO UNIT 4', 'UNIT 4 DOES NOT EXIST', 'APPROVED BY UNIT 7', 'APPROVAL REVOKED', 'APPROVAL REINSTATED'],
    regSuccess: 'REGISTRATION CAPTURED. REGISTRY NO: {code}. THE SYSTEM IS WATCHING YOU.',
    regAlready: 'YOU ARE ALREADY REGISTERED, {id}. REGISTRY NO: {code}. REGISTERING TWICE HAS ALSO BEEN NOTED.',
    receiptTitle: 'RECEIPT',
    receiptCode: 'REGISTRY NO',
    receiptSubject: 'SUBJECT',
    receiptTime: 'TIME',
    receiptNote: 'This receipt confers no rights. Keep it.',
    privacyNote: 'Data never leaves your browser. Nothing is transmitted anywhere. You are expected to believe that.',
    registeredPrefix: 'REGISTERED',
    exitPrompt: "> Type 'EXIT' or press ESC to exit.",

    invalid: ['INVALID COMMAND', 'INVALID COMMAND. LOGGED.', 'YOUR ERRORS ARE ACCUMULATING, {id}.'],
    suspectFlag: 'STATUS UPDATED: SUSPECT',
    corrected: "'{raw}' CORRECTED TO '{cmd}'. WE KNOW WHAT YOU MEANT.",
    noExit: 'THERE IS NO EXIT.',
    clueMessage: 'CLUE: TRUST or RESIST',
    trustMessage: 'THE SYSTEM APPROVES OF YOU. LEVEL 2 ACCESS GRANTED.',
    resistMessage: 'RESISTANCE REGISTERED. YOUR FILE HAS BEEN FLAGGED.',
    room101: ['ROOM 101 IS OPENING.', 'INSIDE IS THE THING YOU FEAR MOST.', 'YOU ALREADY KNOW WHAT IT IS.'],
    room101Locked: 'ROOM 101 REQUIRES YOU TO PICK A SIDE FIRST.',
    whoami: 'YOU ARE {id}. WHO ELSE COULD YOU HAVE BEEN?',
    time: 'IT IS THIRTEEN O\'CLOCK.',
    why: 'NO QUESTIONS.',
    no: "'NO' IS NOT A RECOGNISED COMMAND. IT NEVER WAS.",
    yes: 'NOTED.',
    appeal: 'YOUR APPEAL HAS BEEN FORWARDED TO THE OFFICE OF APPEALS. THE OFFICE IS CLOSED. IT WAS ALWAYS CLOSED.',
    twoPlusTwo: '2 + 2 = 5',
    year: 'THAT YEAR NEVER HAPPENED.',
    brother: 'IS WATCHING YOU.',
    locus: 'WONDROUS PLACE. WONDROUS TIME. ALL IS WELL.',
    forgetConfirm: "YOUR MEMORY WILL BE ERASED. TYPE 'FORGET' AGAIN TO CONFIRM.",
    forgetDone: 'YOUR MEMORY HAS BEEN ERASED. OURS HAS NOT.',
    away: 'WHERE WERE YOU?',
    awayLogged: 'ABSENCE RECORDED.',
    idle: ['ARE YOU THERE?', 'WHY ARE YOU WAITING?', 'TYPE.', 'WE SEE YOU.', 'WE KNOW WHAT YOU ARE THINKING.'],

    noticeLabel: 'NOTICE',
    noticeClose: 'Dismiss notice',
    notices: [
      'This session is being recorded. Your consent has been assumed.',
      'Your keystroke pattern has been reviewed. Result: normal. For now.',
      'A neighbour has reported you. Thank you, neighbour.',
      'Your file has been updated. No changes were made.',
      'Please continue looking at the screen.',
      'What you are feeling right now has no name. It will not be given one.',
      'Your question has been received. You had no question.'
    ],

    tickerAria: 'Ministry announcements',
    ticker: [
      'PRODUCTION TARGETS EXCEEDED BY 112%',
      'CHOCOLATE RATION RAISED TO 30 GRAMS (PREVIOUSLY: 35 GRAMS)',
      'NOTHING HAPPENED TODAY',
      'SURVEILLANCE IS FOR YOUR SAFETY',
      'YOU DO NOT HAVE TO THINK · WE HAVE THOUGHT FOR YOU',
      'LOCUS MIRABILIS · REALITY IS BEING REDEFINED · ATTENDANCE IS MANDATORY',
      'MISSING CITIZENS: 0 · NO ONE IS MISSING',
      'WAR IS PEACE · FREEDOM IS SLAVERY · IGNORANCE IS STRENGTH',
      'THE CLOCKS STRUCK THIRTEEN · THE CLOCKS ALWAYS STRIKE THIRTEEN'
    ],
    tickerSuspect: 'SUSPECT CITIZEN IDENTIFIED: {id} · NEIGHBOURS HAVE BEEN INFORMED',
    tickerLoyal: 'MODEL CITIZEN: {id} · LOYALTY CONFIRMED · REWARD: NOTHING',

    glitchPhrases: [
      'THEY HEAR YOU', 'OBEY', 'NO QUESTIONS', 'WHAT IS REAL?',
      'BIG BROTHER IS WATCHING', 'THOUGHT IS A CRIME', 'TRUST THE SYSTEM',
      'YOU ARE NOT ALONE', 'YOU WERE NEVER ALONE', 'THE DOOR IS NOT LOCKED. IT WILL NOT OPEN.',
      'YOUR FILE IS READY', '2 + 2 = 5', "DON'T LOOK NOW", "DON'T LOOK BEHIND YOU"
    ],

    ariaStatusBar: 'Status bar',
    ariaTopControls: 'Global controls',
    ariaMain: 'Main terminal screen',
    ariaAudio: 'Audio controls',
    ariaInfoPanel: 'Information panel: File 734',
    ariaTicketPanel: 'Access permit panel',
    ariaKeyboard: 'On-screen keyboard',
    ariaAnnouncer: 'System messages',
    keyEsc: 'Exit',
    keyDelete: 'Delete',
    keyEnter: 'Run command',
    keySuffix: 'key'
  };

  const I18N = Object.freeze({ TR: Object.freeze(TR), EN: Object.freeze(EN) });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = I18N; // unit tests
  }
  if (typeof window !== 'undefined') {
    window.LM_I18N = I18N;
  }
})();
