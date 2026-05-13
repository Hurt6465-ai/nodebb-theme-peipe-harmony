/* Peipe XHS Profile v17
   - Big XHS-style card like reference 4
   - Own profile: compressed avatar/background upload + edit data
   - Images compressed before upload via Canvas, WebP preferred
*/
(function () {
  'use strict';

  if (window.__peipeXhsProfileV17) return;
  window.__peipeXhsProfileV17 = true;

  var CONFIG = {
    cid: 6,
    mobileMax: 900,
    socialImage: {
      maxSide: 1080,
      maxSizeMB: 0.09,
      quality: 0.58,
      minCompressBytes: 70 * 1024,
      useWebp: true,
      qualities: [0.58, 0.50, 0.44, 0.38, 0.32, 0.26, 0.22]
    },
    avatarImage: {
      maxSide: 512,
      maxSizeMB: 0.06,
      quality: 0.56,
      minCompressBytes: 45 * 1024,
      useWebp: true,
      qualities: [0.56, 0.48, 0.40, 0.34, 0.28, 0.22]
    }
  };

  var TEXT = {
    zh: {
      loading: '加载中...',
      home: '主页',
      notes: '笔记',
      info: '资料',
      reviews: '评价',
      edit: '编辑资料',
      save: '保存更改',
      cancel: '取消',
      uploadAvatar: '上传头像',
      uploadCover: '上传背景',
      changeAvatar: '换头像',
      changeCover: '换背景',
      saving: '保存中...',
      uploading: '上传中...',
      uploadOk: '上传成功',
      uploadFail: '上传失败',
      saveOk: '资料已保存',
      saveFail: '保存失败',
      name: '显示名',
      bio: '简介',
      country: '国家 / 地区',
      gender: '性别',
      birthday: '生日',
      nativeLang: '母语',
      learnLang: '想学',
      occupation: '职业',
      relationship: '感情',
      height: '身高 cm',
      weight: '体重 kg',
      male: '男',
      female: '女',
      secret: '保密',
      none: '未填写',
      following: '关注',
      followers: '粉丝',
      views: '浏览',
      reputation: '声望',
      chat: '聊天',
      follow: '关注',
      followed: '已关注',
      backHome: '返回主页',
      noBio: '这个人还没有写简介。',
      emptyNotes: '还没有笔记。',
      emptyReviews: '还没有评价。',
      writeReview: '给 TA 评价',
      reviewPlaceholder: '写一句真实印象，例如：很有耐心，适合练口语。',
      submitReview: '发布评价',
      updateReview: '更新评价',
      needLogin: '请先登录',
      cannotReview: '暂时不能评价：需要互相聊过或满足评价权限后才能评价。',
      reviewFail: '评价失败'
    },
    en: {
      loading: 'Loading...',
      home: 'Home',
      notes: 'Notes',
      info: 'Info',
      reviews: 'Reviews',
      edit: 'Edit profile',
      save: 'Save',
      cancel: 'Cancel',
      uploadAvatar: 'Upload avatar',
      uploadCover: 'Upload background',
      changeAvatar: 'Avatar',
      changeCover: 'Background',
      saving: 'Saving...',
      uploading: 'Uploading...',
      uploadOk: 'Uploaded',
      uploadFail: 'Upload failed',
      saveOk: 'Saved',
      saveFail: 'Save failed',
      name: 'Display name',
      bio: 'Bio',
      country: 'Country',
      gender: 'Gender',
      birthday: 'Birthday',
      nativeLang: 'Native',
      learnLang: 'Learning',
      occupation: 'Occupation',
      relationship: 'Relationship',
      height: 'Height cm',
      weight: 'Weight kg',
      male: 'Male',
      female: 'Female',
      secret: 'Secret',
      none: 'Empty',
      following: 'Following',
      followers: 'Followers',
      views: 'Views',
      reputation: 'Reputation',
      chat: 'Chat',
      follow: 'Follow',
      followed: 'Following',
      backHome: 'Back home',
      noBio: 'No bio yet.',
      emptyNotes: 'No notes yet.',
      emptyReviews: 'No reviews yet.',
      writeReview: 'Review',
      reviewPlaceholder: 'Write a real impression.',
      submitReview: 'Post',
      updateReview: 'Update',
      needLogin: 'Please log in first',
      cannotReview: 'Review is not available yet.',
      reviewFail: 'Review failed'
    }
  };

  var state = {
    root: null,
    profile: null,
    comments: [],
    viewerComment: null,
    averageRating: 0,
    ratingCount: 0,
    currentRating: 5,
    activeTab: 'home',
    editing: false,
    topics: []
  };

  function lang() {
    var code = String((window.config && config.userLang) || navigator.language || 'zh').toLowerCase();
    return code.indexOf('zh') === 0 ? TEXT.zh : TEXT.en;
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function norm(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>'"]/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[ch];
    });
  }
  function rel(path) {
    var base = window.config && window.config.relative_path || '';
    if (!path) return base || '';
    if (/^https?:\/\//i.test(path)) return path;
    if (base && path.indexOf(base + '/') === 0) return path;
    return base + path;
  }
  function csrfToken() {
    return window.config && (window.config.csrf_token || window.config.csrfToken) ||
      (document.querySelector('meta[name="csrf-token"]') && document.querySelector('meta[name="csrf-token"]').getAttribute('content')) ||
      '';
  }
  function currentUser() { return window.app && window.app.user || {}; }
  function currentUid() { return Number(currentUser().uid || 0); }
  function alertOk(msg) { if (window.app && app.alertSuccess) app.alertSuccess(msg); else console.log(msg); }
  function alertErr(msg) { if (window.app && app.alertError) app.alertError(msg); else alert(msg); }

  function apiFetch(url, options) {
    options = options || {};
    options.credentials = options.credentials || 'same-origin';
    options.headers = Object.assign({ accept: 'application/json', 'x-requested-with': 'XMLHttpRequest' }, options.headers || {});
    return fetch(rel(url), options).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (!res.ok) {
          var msg = json.error || json.message || json.status && json.status.message || ('HTTP ' + res.status);
          var err = new Error(msg);
          err.status = res.status;
          throw err;
        }
        return json.response || json;
      });
    });
  }

  function slugFromPath() {
    var parts = location.pathname.split('/').filter(Boolean);
    return parts[0] === 'user' ? decodeURIComponent(parts[1] || '') : '';
  }
  function tabFromPath() {
    var p = location.pathname.split('/').filter(Boolean)[2] || '';
    if (p === 'topics') return 'notes';
    if (p === 'about') return 'info';
    return 'home';
  }
  function isOwn() {
    var p = state.profile || {};
    var me = currentUser();
    if (!me || !p) return false;
    if (Number(me.uid || 0) && Number(p.uid || 0) && Number(me.uid) === Number(p.uid)) return true;
    var s = String(p.userslug || p.username || '').toLowerCase();
    return s && (s === String(me.userslug || '').toLowerCase() || s === String(me.username || '').toLowerCase());
  }

  function normalizeProfile(raw) {
    raw = raw || {};
    var ajax = window.ajaxify && window.ajaxify.data || {};
    var u = ajax.user || ajax || {};
    var root = state.root;
    return Object.assign({
      uid: raw.uid || u.uid || Number(root && root.dataset.uid || 0),
      username: raw.username || u.username || root && root.dataset.username || slugFromPath(),
      userslug: raw.userslug || u.userslug || root && root.dataset.userslug || slugFromPath(),
      displayname: raw.displayname || raw.fullname || u.displayname || u.fullname || u.username || root && root.dataset.username || slugFromPath(),
      picture: raw.avatar || raw.peipe_xhs_avatar || raw.picture || raw.uploadedpicture || u.picture || u.uploadedpicture || root && root.dataset.picture || '',
      cover: raw.cover || raw.peipe_xhs_cover || raw['cover:url'] || u['cover:url'] || '',
      bio: raw.bio || raw.peipe_partner_bio || raw.aboutme || raw.signature || u.aboutme || u.signature || root && root.dataset.about || '',
      country: raw.country || raw.peipe_partner_country || u.country || u.location || u.language_flag || '',
      gender: raw.gender || raw.peipe_partner_gender || u.gender || '',
      birthday: raw.birthday || raw.peipe_partner_birthday || u.birthday || '',
      nativeLanguages: normalizeArray(raw.nativeLanguages || raw.language_fluent || raw.native_language || raw.language_native || u.language_fluent || u.native_language || u.language_native),
      learningLanguages: normalizeArray(raw.learningLanguages || raw.language_learning || raw.learning_language || raw.language_target || u.language_learning || u.learning_language || u.language_target),
      occupation: raw.occupation || raw.peipe_partner_occupation || u.occupation || '',
      relationship: raw.relationship || raw.peipe_partner_relationship || u.relationship || '',
      height: raw.height || raw.peipe_partner_height || u.height || '',
      weight: raw.weight || raw.peipe_partner_weight || u.weight || '',
      reputation: raw.reputation || u.reputation || 0,
      followingCount: raw.followingCount || raw.following || u.followingCount || u.following || 0,
      followerCount: raw.followerCount || raw.followers || u.followerCount || u.followers || 0,
      profileviews: raw.profileviews || raw.views || u.profileviews || 0,
      topiccount: raw.topiccount || u.topiccount || 0,
      postcount: raw.postcount || u.postcount || 0
    }, raw);
  }

  function normalizeArray(v) {
    if (Array.isArray(v)) return v.map(norm).filter(Boolean);
    var s = norm(v);
    if (!s || s === '[]') return [];
    try {
      var p = JSON.parse(s);
      if (Array.isArray(p)) return p.map(norm).filter(Boolean);
    } catch (e) {}
    return s.split(/[,\u3001\/|]+/).map(norm).filter(Boolean);
  }

  function ageFromBirthday(birthday) {
    if (!birthday) return '';
    var d = new Date(birthday);
    if (!d || isNaN(d.getTime())) return '';
    var now = new Date();
    var age = now.getFullYear() - d.getFullYear();
    var m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
    return age > 0 && age < 120 ? String(age) : '';
  }

  function countryFlag(country) {
    var s = String(country || '').toLowerCase();
    var pairs = [
      ['中国', '🇨🇳'], ['china', '🇨🇳'], ['cn', '🇨🇳'],
      ['缅甸', '🇲🇲'], ['myanmar', '🇲🇲'], ['burma', '🇲🇲'], ['mm', '🇲🇲'],
      ['越南', '🇻🇳'], ['vietnam', '🇻🇳'], ['vn', '🇻🇳'],
      ['泰国', '🇹🇭'], ['thailand', '🇹🇭'], ['th', '🇹🇭'],
      ['美国', '🇺🇸'], ['usa', '🇺🇸'], ['united states', '🇺🇸'], ['us', '🇺🇸'],
      ['英国', '🇬🇧'], ['uk', '🇬🇧'], ['united kingdom', '🇬🇧'],
      ['日本', '🇯🇵'], ['japan', '🇯🇵'], ['jp', '🇯🇵'],
      ['韩国', '🇰🇷'], ['korea', '🇰🇷'], ['kr', '🇰🇷'],
      ['老挝', '🇱🇦'], ['laos', '🇱🇦'],
      ['柬埔寨', '🇰🇭'], ['cambodia', '🇰🇭'],
      ['马来西亚', '🇲🇾'], ['malaysia', '🇲🇾'],
      ['菲律宾', '🇵🇭'], ['philippines', '🇵🇭']
    ];
    for (var i = 0; i < pairs.length; i += 1) {
      if (s === pairs[i][0] || s.indexOf(pairs[i][0]) !== -1) return pairs[i][1];
    }
    return '';
  }

  function langCode(v) {
    var s = norm(v).toLowerCase();
    var map = {
      '中文': 'CN', '汉语': 'CN', '普通话': 'CN', 'chinese': 'CN', 'mandarin': 'CN', 'zh': 'CN', 'cn': 'CN',
      '英语': 'EN', '英文': 'EN', 'english': 'EN', 'en': 'EN',
      '缅甸语': 'MM', '缅语': 'MM', 'burmese': 'MM', 'myanmar': 'MM', 'my': 'MM', 'mm': 'MM',
      '泰语': 'TH', 'thai': 'TH', 'th': 'TH',
      '越南语': 'VN', 'vietnamese': 'VN', 'vi': 'VN', 'vn': 'VN',
      '日语': 'JP', 'japanese': 'JP', 'ja': 'JP', 'jp': 'JP',
      '韩语': 'KR', 'korean': 'KR', 'ko': 'KR', 'kr': 'KR',
      '老挝语': 'LA', 'lao': 'LA',
      '高棉语': 'KM', 'khmer': 'KM',
      '马来语': 'MS', 'malay': 'MS',
      '菲律宾语': 'TL', 'tagalog': 'TL'
    };
    if (map[s]) return map[s];
    if (/^[a-z]{2,4}$/i.test(s)) return s.toUpperCase();
    return norm(v).slice(0, 3).toUpperCase();
  }

  function languagePair(profile) {
    var a = (profile.nativeLanguages || []).map(langCode).filter(Boolean).slice(0, 2);
    var b = (profile.learningLanguages || []).map(langCode).filter(Boolean).slice(0, 5);
    if (!a.length && !b.length) return '';
    if (!a.length) return b.join(' ');
    if (!b.length) return a.join(' ');
    return a.join(' ') + ' ⇄ ' + b.join(' ');
  }

  function genderIcon(gender) {
    var g = norm(gender).toLowerCase();
    if (g === 'male' || g === 'm' || g === '男') return '<span class="pxp-sex pxp-sex-m">♂</span>';
    if (g === 'female' || g === 'f' || g === '女') return '<span class="pxp-sex pxp-sex-f">♀</span>';
    return '<span class="pxp-sex pxp-sex-s">⚥</span>';
  }

  function renderStars(value, editable) {
    value = Math.max(0, Math.min(5, Number(value || 0)));
    var out = '<div class="pxp-stars' + (editable ? ' is-editable' : '') + '">';
    for (var i = 1; i <= 5; i += 1) {
      out += '<button type="button" class="pxp-star' + (i <= value ? ' active' : '') + '" data-rating="' + i + '"' + (editable ? '' : ' disabled') + '>★</button>';
    }
    return out + '</div>';
  }

  function render() {
    var t = lang();
    var p = state.profile || normalizeProfile({});
    var cover = p.cover || '';
    var avatar = p.picture || '';
    var flag = countryFlag(p.country);
    var age = p.age || ageFromBirthday(p.birthday);
    var pair = languagePair(p);
    var own = isOwn();

    document.body.classList.add('peipe-xhs-active');
    state.root.innerHTML = '' +
      '<main class="pxp-page">' +
        '<section class="pxp-hero">' +
          '<div class="pxp-cover" style="' + (cover ? 'background-image:url(' + cssUrl(cover) + ')' : '') + '"></div>' +
          '<div class="pxp-cover-shade"></div>' +
          '<button type="button" class="pxp-more-btn" aria-label="more">•••</button>' +
          '<div class="pxp-menu" hidden>' +
            (own ? '<button type="button" data-action="avatar">' + esc(t.uploadAvatar) + '</button><button type="button" data-action="cover">' + esc(t.uploadCover) + '</button><button type="button" data-action="edit">' + esc(t.edit) + '</button>' : '') +
          '</div>' +
          '<div class="pxp-hero-content">' +
            '<div class="pxp-top-row">' +
              '<div class="pxp-avatar-wrap">' +
                '<div class="pxp-avatar">' + (avatar ? '<img src="' + esc(avatar) + '" alt="">' : '<span>' + esc((p.displayname || p.username || '?').slice(0, 1).toUpperCase()) + '</span>') + '</div>' +
                (flag ? '<span class="pxp-flag">' + flag + '</span>' : '') +
                (own ? '<button type="button" class="pxp-avatar-plus" data-action="avatar">📷</button>' : '') +
              '</div>' +
              '<div class="pxp-title-block">' +
                '<div class="pxp-name-line"><h1>' + esc(p.displayname || p.username || p.userslug) + '</h1>' + (age || p.gender ? '<span class="pxp-age-chip">' + genderIcon(p.gender) + (age ? '<b>' + esc(age) + '岁</b>' : '') + '</span>' : '') + '</div>' +
                '<div class="pxp-handle">@' + esc(p.userslug || p.username || '') + '</div>' +
                (pair ? '<div class="pxp-lang">' + esc(pair).replace('⇄', '<span>⇄</span>') + '</div>' : '') +
                (p.country ? '<div class="pxp-location">📍 ' + esc(p.country) + '</div>' : '') +
              '</div>' +
            '</div>' +
            '<p class="pxp-bio">' + esc(norm(p.bio) || t.noBio) + '</p>' +
            '<div class="pxp-stats">' +
              '<div><b>' + esc(p.followingCount || 0) + '</b><span>' + esc(t.following) + '</span></div>' +
              '<div><b>' + esc(p.followerCount || 0) + '</b><span>' + esc(t.followers) + '</span></div>' +
              '<div><b>' + esc(p.profileviews || 0) + '</b><span>' + esc(t.views) + '</span></div>' +
            '</div>' +
            '<div class="pxp-actions">' +
              (own ? '<button type="button" class="pxp-primary" data-action="edit">' + esc(t.edit) + '</button>' : '<button type="button" class="pxp-primary" data-action="chat">' + esc(t.chat) + '</button>') +
            '</div>' +
          '</div>' +
        '</section>' +
        '<nav class="pxp-tabs">' +
          tabButton('home', t.home) +
          tabButton('notes', t.notes) +
          tabButton('reviews', t.reviews) +
          tabButton('info', t.info) +
        '</nav>' +
        '<section class="pxp-content">' + renderTabContent() + '</section>' +
      '</main>';

    bindEvents();
  }

  function tabButton(key, label) {
    return '<button type="button" class="' + (state.activeTab === key ? 'active' : '') + '" data-tab="' + key + '">' + esc(label) + '</button>';
  }

  function renderTabContent() {
    if (state.editing) return renderEditForm();
    if (state.activeTab === 'notes') return renderNotes();
    if (state.activeTab === 'reviews') return renderReviews();
    if (state.activeTab === 'info') return renderInfo();
    return renderHome();
  }

  function renderHome() {
    var p = state.profile || {};
    var t = lang();
    return '<div class="pxp-card pxp-home-card">' +
      '<h2>' + esc(t.info) + '</h2>' +
      '<div class="pxp-info-grid">' +
        infoItem(t.nativeLang, (p.nativeLanguages || []).map(langCode).join(' / ') || t.none) +
        infoItem(t.learnLang, (p.learningLanguages || []).map(langCode).join(' / ') || t.none) +
        infoItem(t.occupation, p.occupation || t.none) +
        infoItem(t.relationship, p.relationship || t.none) +
      '</div>' +
    '</div>';
  }

  function renderInfo() {
    var p = state.profile || {};
    var t = lang();
    return '<div class="pxp-card"><h2>' + esc(t.info) + '</h2><div class="pxp-info-grid">' +
      infoItem(t.country, (countryFlag(p.country) ? countryFlag(p.country) + ' ' : '') + (p.country || t.none)) +
      infoItem(t.gender, genderLabel(p.gender)) +
      infoItem(t.birthday, p.birthday || t.none) +
      infoItem(t.height, p.height ? p.height + ' cm' : t.none) +
      infoItem(t.weight, p.weight ? p.weight + ' kg' : t.none) +
      infoItem(t.occupation, p.occupation || t.none) +
      infoItem(t.relationship, p.relationship || t.none) +
      infoItem(t.nativeLang, (p.nativeLanguages || []).join(' / ') || t.none) +
      infoItem(t.learnLang, (p.learningLanguages || []).join(' / ') || t.none) +
      '</div></div>';
  }

  function genderLabel(g) {
    var t = lang();
    var s = norm(g).toLowerCase();
    if (s === 'male' || s === 'm' || s === '男') return t.male;
    if (s === 'female' || s === 'f' || s === '女') return t.female;
    return t.secret;
  }

  function infoItem(label, value) {
    return '<div class="pxp-info-item"><span>' + esc(label) + '</span><b>' + esc(value) + '</b></div>';
  }

  function renderNotes() {
    var t = lang();
    var topics = state.topics || getAjaxTopics();
    if (!topics.length) return '<div class="pxp-card pxp-empty">' + esc(t.emptyNotes) + '</div>';
    return '<div class="pxp-notes-grid">' + topics.map(function (it) {
      var title = it.title || it.topic && it.topic.title || '笔记';
      var teaser = it.teaser || it.content || it.topic && it.topic.teaser || '';
      var href = it.slug ? rel('/topic/' + it.slug) : (it.tid ? rel('/topic/' + it.tid) : '#');
      var image = firstImage(teaser);
      return '<a class="pxp-note" href="' + esc(href) + '">' +
        '<div class="pxp-note-img" style="' + (image ? 'background-image:url(' + cssUrl(image) + ')' : '') + '"></div>' +
        '<b>' + esc(title) + '</b><span>' + esc(stripHtml(teaser).slice(0, 36)) + '</span></a>';
    }).join('') + '</div>';
  }

  function getAjaxTopics() {
    var d = window.ajaxify && window.ajaxify.data || {};
    var list = d.topics || d.posts || d.user && d.user.topics || [];
    return Array.isArray(list) ? list : [];
  }
  function firstImage(html) {
    var m = String(html || '').match(/<img[^>]+src=["']([^"']+)["']/i) || String(html || '').match(/!\[[^\]]*\]\(([^)]+)\)/);
    return m ? m[1] : '';
  }
  function stripHtml(s) { return String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(); }

  function renderReviews() {
    var t = lang();
    var p = state.profile || {};
    var own = isOwn();
    var canReview = currentUid() && !own;
    var old = state.viewerComment || {};
    return '<div class="pxp-card pxp-rating-card">' +
      '<div class="pxp-rating-number">' + Number(state.averageRating || 0).toFixed(1) + '</div>' +
      '<div>' + renderStars(Math.round(state.averageRating || 0), false) + '<span>' + Number(state.ratingCount || 0) + ' 人评分</span></div>' +
    '</div>' +
    (canReview ? '<div class="pxp-card pxp-review-compose"><h2>' + esc(t.writeReview) + '</h2>' + renderStars(Number(old.rating || state.currentRating || 5), true) +
      '<textarea class="pxp-review-input" maxlength="120" placeholder="' + esc(t.reviewPlaceholder) + '">' + esc(old.content || '') + '</textarea>' +
      '<button type="button" class="pxp-primary" data-action="review">' + esc(old.id ? t.updateReview : t.submitReview) + '</button></div>' : '') +
    '<div class="pxp-review-list">' + ((state.comments || []).length ? state.comments.map(renderReviewItem).join('') : '<div class="pxp-card pxp-empty">' + esc(t.emptyReviews) + '</div>') + '</div>';
  }

  function renderReviewItem(item) {
    return '<article class="pxp-review-item"><div class="pxp-review-avatar">' + (item.authorAvatar ? '<img src="' + esc(item.authorAvatar) + '" alt="">' : '') + '</div><div><div class="pxp-review-head"><b>' + esc(item.authorName || item.username || '用户') + '</b>' + renderStars(Number(item.rating || 0), false) + '</div><p>' + esc(item.content || '') + '</p></div></article>';
  }

  function renderEditForm() {
    var t = lang();
    var p = state.profile || {};
    function input(name, label, value, type) {
      return '<label><span>' + esc(label) + '</span><input name="' + esc(name) + '" type="' + (type || 'text') + '" value="' + esc(value || '') + '"></label>';
    }
    return '<form class="pxp-card pxp-edit-form">' +
      '<h2>' + esc(t.edit) + '</h2>' +
      input('displayname', t.name, p.displayname) +
      '<label><span>' + esc(t.bio) + '</span><textarea name="bio" maxlength="160">' + esc(p.bio || '') + '</textarea></label>' +
      input('country', t.country, p.country) +
      '<label><span>' + esc(t.gender) + '</span><select name="gender">' +
        '<option value="secret"' + selected(p.gender, 'secret') + '>' + esc(t.secret) + '</option>' +
        '<option value="male"' + selected(p.gender, 'male') + '>' + esc(t.male) + '</option>' +
        '<option value="female"' + selected(p.gender, 'female') + '>' + esc(t.female) + '</option>' +
      '</select></label>' +
      input('birthday', t.birthday, p.birthday, 'date') +
      input('nativeLanguages', t.nativeLang, (p.nativeLanguages || []).join(',')) +
      input('learningLanguages', t.learnLang, (p.learningLanguages || []).join(',')) +
      input('occupation', t.occupation, p.occupation) +
      input('relationship', t.relationship, p.relationship) +
      input('height', t.height, p.height, 'number') +
      input('weight', t.weight, p.weight, 'number') +
      '<div class="pxp-edit-actions"><button type="button" class="pxp-secondary" data-action="cancel-edit">' + esc(t.cancel) + '</button><button type="submit" class="pxp-primary">' + esc(t.save) + '</button></div>' +
    '</form>';
  }
  function selected(value, expected) { return String(value || '').toLowerCase() === expected ? ' selected' : ''; }

  function cssUrl(url) { return '"' + String(url || '').replace(/[\\\"\n\r\f]/g, '\\$&') + '"'; }

  function bindEvents() {
    $$('.pxp-tabs button', state.root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.activeTab = btn.dataset.tab || 'home';
        state.editing = false;
        render();
      });
    });

    state.root.addEventListener('click', function (e) {
      var act = e.target.closest('[data-action]');
      if (!act) return;
      var action = act.dataset.action;
      if (action === 'avatar') chooseAndUpload('avatar');
      if (action === 'cover') chooseAndUpload('cover');
      if (action === 'edit') { state.editing = true; render(); }
      if (action === 'cancel-edit') { state.editing = false; render(); }
      if (action === 'review') submitReview();
      if (action === 'chat') openChat();
    });

    var more = $('.pxp-more-btn', state.root);
    var menu = $('.pxp-menu', state.root);
    if (more && menu) {
      more.addEventListener('click', function (e) {
        e.stopPropagation();
        menu.hidden = !menu.hidden;
      });
      document.addEventListener('click', function () { if (menu) menu.hidden = true; }, { once: true });
    }

    $$('.pxp-stars.is-editable .pxp-star', state.root).forEach(function (star) {
      star.addEventListener('click', function () {
        state.currentRating = Number(star.dataset.rating || 5);
        $$('.pxp-stars.is-editable .pxp-star', state.root).forEach(function (s) {
          s.classList.toggle('active', Number(s.dataset.rating || 0) <= state.currentRating);
        });
      });
    });

    var form = $('.pxp-edit-form', state.root);
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        saveProfile(form);
      });
    }
  }

  function openChat() {
    var slug = state.profile && state.profile.userslug || slugFromPath();
    var nativeChat = document.querySelector('[component="account/chat"],[component="account/new-chat"]');
    if (nativeChat) nativeChat.click();
    else location.href = rel('/chats/' + encodeURIComponent(slug));
  }

  function formValue(form, name) {
    var el = form.elements[name];
    return el ? norm(el.value) : '';
  }

  function saveProfile(form) {
    var t = lang();
    var payload = {
      displayname: formValue(form, 'displayname'),
      bio: formValue(form, 'bio'),
      country: formValue(form, 'country'),
      gender: formValue(form, 'gender') || 'secret',
      birthday: formValue(form, 'birthday'),
      nativeLanguages: normalizeArray(formValue(form, 'nativeLanguages')),
      learningLanguages: normalizeArray(formValue(form, 'learningLanguages')),
      occupation: formValue(form, 'occupation'),
      relationship: formValue(form, 'relationship'),
      height: formValue(form, 'height'),
      weight: formValue(form, 'weight')
    };
    var btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = t.saving; }

    apiFetch('/api/peipe-partners/profile/me/card', {
      method: 'PUT',
      headers: { 'content-type': 'application/json; charset=utf-8', 'x-csrf-token': csrfToken() },
      body: JSON.stringify(payload)
    }).then(function (json) {
      state.profile = normalizeProfile(Object.assign({}, state.profile, json.profile || payload));
      state.editing = false;
      alertOk(t.saveOk);
      render();
    }).catch(function (err) {
      alertErr(err.message || t.saveFail);
    }).finally(function () {
      if (btn) { btn.disabled = false; btn.textContent = t.save; }
    });
  }

  function submitReview() {
    var t = lang();
    var p = state.profile || {};
    var input = $('.pxp-review-input', state.root);
    var content = norm(input && input.value);
    if (!currentUid()) return alertErr(t.needLogin);
    if (!content) return alertErr(t.reviewPlaceholder);
    apiFetch('/api/peipe-partners/profile/' + encodeURIComponent(p.uid) + '/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8', 'x-csrf-token': csrfToken() },
      body: JSON.stringify({ rating: Math.max(1, Math.min(5, Number(state.currentRating || 5))), content: content })
    }).then(function () {
      return loadComments();
    }).catch(function (err) {
      if (err.status === 403) alertErr(t.cannotReview);
      else alertErr(err.message || t.reviewFail);
    });
  }

  function chooseAndUpload(kind) {
    var t = lang();
    if (!isOwn()) return;
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      input.remove();
      if (!file) return;
      uploadProfileImage(kind, file);
    });
    input.click();
  }

  async function uploadProfileImage(kind, file) {
    var t = lang();
    try {
      showBusy(t.uploading);
      var cfg = kind === 'avatar' ? CONFIG.avatarImage : CONFIG.socialImage;
      var compressed = await compressImageFile(file, cfg);
      var url = await uploadToNodeBB(compressed);
      var payload = {};
      payload[kind === 'avatar' ? 'avatar' : 'cover'] = url;
      var json = await apiFetch('/api/peipe-partners/profile/me/card', {
        method: 'PUT',
        headers: { 'content-type': 'application/json; charset=utf-8', 'x-csrf-token': csrfToken() },
        body: JSON.stringify(payload)
      });
      if (kind === 'avatar') state.profile.picture = url;
      else state.profile.cover = url;
      if (json.profile) state.profile = normalizeProfile(Object.assign({}, state.profile, json.profile));
      alertOk(t.uploadOk);
      render();
    } catch (err) {
      alertErr((err && err.message) || t.uploadFail);
    } finally {
      hideBusy();
    }
  }

  function showBusy(text) {
    var old = document.getElementById('pxpBusyToast');
    if (old) old.remove();
    var div = document.createElement('div');
    div.id = 'pxpBusyToast';
    div.className = 'pxp-busy-toast';
    div.textContent = text || '...';
    document.body.appendChild(div);
  }
  function hideBusy() {
    var old = document.getElementById('pxpBusyToast');
    if (old) old.remove();
  }

  async function canEncode(type) {
    try {
      var canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      if (!canvas.toBlob) return false;
      return await new Promise(function (resolve) {
        canvas.toBlob(function (blob) {
          resolve(!!blob && blob.type === type);
        }, type, 0.8);
      });
    } catch (e) {
      return false;
    }
  }

  function extForMime(type) {
    if (type === 'image/webp') return '.webp';
    if (type === 'image/png') return '.png';
    return '.jpg';
  }

  async function compressImageFile(file, cfg) {
    if (!file || !/^image\//i.test(file.type)) throw new Error('请选择图片文件');
    if (/image\/(gif|svg\+xml|heic|heif)/i.test(file.type)) return file;
    if (file.size < Number(cfg.minCompressBytes || 0)) return file;

    var targetType = cfg.useWebp && await canEncode('image/webp') ? 'image/webp' : 'image/jpeg';
    var blob = await compressByCanvas(file, targetType, cfg);
    if (!blob) return file;

    var base = String(file.name || ('image-' + Date.now())).replace(/\.[^.]+$/, '');
    return new File([blob], base + extForMime(targetType), { type: targetType, lastModified: Date.now() });
  }

  async function compressByCanvas(file, targetType, cfg) {
    var url = URL.createObjectURL(file);
    try {
      var img = await loadImage(url);
      var width0 = img.naturalWidth || img.width;
      var height0 = img.naturalHeight || img.height;
      var scale = Math.min(1, Number(cfg.maxSide || 1080) / Math.max(width0, height0));
      var canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width0 * scale));
      canvas.height = Math.max(1, Math.round(height0 * scale));
      var ctx = canvas.getContext('2d');
      if (!ctx || !canvas.toBlob) return null;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      var targetBytes = Number(cfg.maxSizeMB || 0.1) * 1024 * 1024;
      var qualities = cfg.qualities && cfg.qualities.length ? cfg.qualities : [cfg.quality || 0.58, 0.5, 0.42, 0.34, 0.26];
      var best = null;
      for (var i = 0; i < qualities.length; i += 1) {
        var q = qualities[i];
        var b = await new Promise(function (resolve) {
          canvas.toBlob(resolve, targetType, q);
        });
        if (!b) continue;
        best = b;
        if (b.size <= targetBytes) break;
      }
      return best;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function loadImage(url) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('图片读取失败，请换一张图片或重新选择')); };
      img.src = url;
    });
  }

  function uploadToNodeBB(file) {
    var form = new FormData();
    form.append('files[]', file);
    form.append('cid', String(CONFIG.cid));
    return fetch(rel('/api/post/upload'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'x-csrf-token': csrfToken(), 'x-requested-with': 'XMLHttpRequest' },
      body: form
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (!res.ok) throw new Error(json.error || json.message || json.status && json.status.message || 'upload failed');
        var url = extractUploadUrl(json);
        if (!url) throw new Error('上传成功但没有返回图片地址');
        return url;
      });
    });
  }

  function extractUploadUrl(payload) {
    function looks(v) {
      return typeof v === 'string' && v && (/^(https?:)?\//i.test(v) || /^\/assets\//i.test(v));
    }
    var queue = [payload], seen = new Set();
    while (queue.length) {
      var cur = queue.shift();
      if (!cur || seen.has(cur)) continue;
      if (looks(cur)) return cur;
      if (typeof cur !== 'object') continue;
      seen.add(cur);
      if (Array.isArray(cur)) {
        cur.forEach(function (x) { queue.push(x); });
      } else {
        Object.keys(cur).forEach(function (k) {
          if (looks(cur[k])) queue.unshift(cur[k]);
          else if (cur[k] && typeof cur[k] === 'object') queue.push(cur[k]);
        });
      }
    }
    return '';
  }

  function loadProfile() {
    var slug = state.root.dataset.userslug || slugFromPath();
    var uid = Number(state.root.dataset.uid || 0);
    state.profile = normalizeProfile({ uid: uid, userslug: slug });
    render();

    var key = uid || slug;
    return apiFetch('/api/peipe-partners/profile/' + encodeURIComponent(key) + '/card')
      .then(function (json) {
        state.profile = normalizeProfile(json.profile || json.user || json);
        render();
      })
      .catch(function () {
        return apiFetch('/api/user/' + encodeURIComponent(slug)).then(function (json) {
          state.profile = normalizeProfile(json.user || json);
          render();
        }).catch(function () {});
      });
  }

  function loadComments() {
    var p = state.profile || {};
    if (!p.uid) return Promise.resolve();
    return apiFetch('/api/peipe-partners/profile/' + encodeURIComponent(p.uid) + '/comments?limit=50')
      .then(function (json) {
        state.comments = json.comments || [];
        state.viewerComment = json.viewerComment || null;
        state.averageRating = Number(json.averageRating || 0);
        state.ratingCount = Number(json.ratingCount || 0);
        if (state.viewerComment && state.viewerComment.rating) state.currentRating = Number(state.viewerComment.rating);
        render();
      })
      .catch(function () {
        state.comments = [];
        state.viewerComment = null;
        state.averageRating = 0;
        state.ratingCount = 0;
        render();
      });
  }

  function init() {
    var root = document.getElementById('peipe-xhs-profile-app');
    if (!root) {
      document.body.classList.remove('peipe-xhs-active');
      return;
    }
    state.root = root;
    state.activeTab = tabFromPath();
    document.body.classList.add('peipe-xhs-active');
    loadProfile().then(loadComments);
  }

  window.addEventListener('action:ajaxify.start', function () {
    document.body.classList.remove('peipe-xhs-active');
  });
  window.addEventListener('action:ajaxify.end', init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
