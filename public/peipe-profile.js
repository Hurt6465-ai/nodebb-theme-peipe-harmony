/* Peipe Harmony profile v16
   - XHS-style profile shell for NodeBB 4.x Harmony clone
   - Renders immediately from ajaxify/template data; comments/topics load lazily
   - Keeps account/profile/about/topics inside the same modern shell
*/
(function () {
  'use strict';

  if (window.__peipeProfileHarmonyV16) return;
  window.__peipeProfileHarmonyV16 = true;

  var TEXTS = {
    zh: {
      loadingComments: '评价加载中...',
      noComments: '还没有评价。',
      commentsApiMissing: '评价接口还没启用，请先更新语伴插件评论版。',
      commentLocked: '暂时不能评价：需要互相聊过满 24 小时或满足评价权限后才能评价。',
      commentFail: '评价失败',
      writeReview: '给 TA 评价',
      updateReview: '更新评价',
      submitReview: '发布评价',
      reviewPlaceholder: '写一句真实印象，例如：很有耐心，适合练口语。',
      loginToReview: '登录后可以给 TA 评价。',
      ownProfileNote: '这是你的主页，下面会显示别人给你的评价。',
      comments: '评价',
      posts: '动态',
      profile: '资料',
      scorePeople: '人评分',
      reputation: '声望',
      topics: '主题',
      postsCount: '帖子',
      followers: '粉丝',
      bioEmpty: '这个人还没有填写介绍。',
      profileInfo: '个人资料',
      partnerInfo: '语伴资料',
      topicsLoading: '动态加载中...',
      topicsEmpty: '还没有公开动态。',
      topicsFail: '动态加载失败，可以打开原动态页查看。',
      openOriginal: '打开原动态',
      unknown: '未填写',
      male: '男',
      female: '女',
      secret: '保密',
      nativeLang: '母语',
      learningLang: '想学',
      country: '国籍',
      height: '身高',
      weight: '体重',
      education: '学历',
      job: '职业',
      relationship: '感情状况',
      tags: '标签'
    },
    en: {
      loadingComments: 'Loading reviews...',
      noComments: 'No reviews yet.',
      commentsApiMissing: 'Review API is not enabled. Please update the Peipe partners plugin.',
      commentLocked: 'You cannot review yet. Reviews require enough chat history or permission.',
      commentFail: 'Review failed',
      writeReview: 'Review this partner',
      updateReview: 'Update review',
      submitReview: 'Post review',
      reviewPlaceholder: 'Write a real impression, e.g. Patient and good for speaking practice.',
      loginToReview: 'Log in to review this partner.',
      ownProfileNote: 'This is your profile. Reviews from others will appear here.',
      comments: 'Reviews',
      posts: 'Posts',
      profile: 'Profile',
      scorePeople: 'ratings',
      reputation: 'Rep',
      topics: 'Topics',
      postsCount: 'Posts',
      followers: 'Fans',
      bioEmpty: 'No bio yet.',
      profileInfo: 'Profile',
      partnerInfo: 'Partner profile',
      topicsLoading: 'Loading posts...',
      topicsEmpty: 'No public posts yet.',
      topicsFail: 'Could not load posts. You can open the original page.',
      openOriginal: 'Open original',
      unknown: 'Not set',
      male: 'Male',
      female: 'Female',
      secret: 'Secret',
      nativeLang: 'Native',
      learningLang: 'Learning',
      country: 'Country',
      height: 'Height',
      weight: 'Weight',
      education: 'Education',
      job: 'Job',
      relationship: 'Relationship',
      tags: 'Tags'
    }
  };

  var state = {
    root: null,
    user: {},
    activeTab: 'comments',
    commentsLoaded: false,
    commentsLoading: false,
    commentsError: '',
    comments: [],
    viewerComment: null,
    averageRating: 0,
    ratingCount: 0,
    currentRating: 5,
    topicsLoaded: false,
    topicsLoading: false,
    topicsError: '',
    topics: []
  };

  function langKey() {
    var raw = String((window.config && (config.userLang || config.defaultLang)) || navigator.language || 'zh').toLowerCase();
    return raw.indexOf('zh') === 0 ? 'zh' : 'en';
  }

  function t(key) {
    return (TEXTS[langKey()] && TEXTS[langKey()][key]) || TEXTS.zh[key] || key;
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function norm(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }
  function esc(s) { return String(s || '').replace(/[&<>'"]/g, function (ch) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[ch]; }); }
  function stripHtml(s) { return String(s || '').replace(/<[^>]*>/g, '').trim(); }

  function rel(path) {
    var base = window.config && window.config.relative_path || '';
    if (!path) return base || '';
    if (/^https?:\/\//i.test(path)) return path;
    if (base && path.indexOf(base + '/') === 0) return path;
    return base + path;
  }

  function csrfToken() {
    return window.config && (window.config.csrf_token || window.config.csrfToken) ||
      ($('meta[name="csrf-token"]') && $('meta[name="csrf-token"]').getAttribute('content')) || '';
  }

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
          err.payload = json;
          throw err;
        }
        return json.response || json;
      });
    });
  }

  function getPathSlug() {
    var m = location.pathname.match(/\/user\/([^\/?#]+)/i);
    return m ? decodeURIComponent(m[1]) : '';
  }

  function getPathTab(defaultTab) {
    if (/\/topics(?:[/?#]|$)/i.test(location.pathname)) return 'topics';
    if (/\/about(?:[/?#]|$)/i.test(location.pathname)) return 'profile';
    return defaultTab || 'comments';
  }

  function dataFromAjaxify() {
    var d = (window.ajaxify && window.ajaxify.data) || {};
    if (d.user && (d.user.uid || d.user.username || d.user.userslug)) return d.user;
    return d || {};
  }

  function cleanTemplateValue(v) {
    v = String(v || '').trim();
    if (/^\{.+\}$/.test(v)) return '';
    return v;
  }

  function mergeUser(base, next) {
    base = base || {};
    next = next || {};
    var out = Object.assign({}, base);
    Object.keys(next).forEach(function (k) {
      if (next[k] !== undefined && next[k] !== null && String(next[k]) !== '') out[k] = next[k];
    });
    return out;
  }

  function collectInitialUser(root) {
    var ajaxUser = dataFromAjaxify();
    var attrUser = {
      uid: cleanTemplateValue(root.getAttribute('data-uid')),
      userslug: cleanTemplateValue(root.getAttribute('data-userslug')) || getPathSlug(),
      username: cleanTemplateValue(root.getAttribute('data-username')) || getPathSlug(),
      picture: cleanTemplateValue(root.getAttribute('data-picture')),
      aboutme: cleanTemplateValue(root.getAttribute('data-about'))
    };
    return mergeUser(attrUser, ajaxUser);
  }

  function currentUid() { return Number(window.app && app.user && app.user.uid || 0); }
  function isOwnProfile() { return currentUid() && Number(state.user && state.user.uid || 0) === currentUid(); }
  function userSlug() { return state.user && (state.user.userslug || state.user.slug || state.user.username) || getPathSlug(); }

  function avatarUrl(user) { return user && (user.picture || user.uploadedpicture || user.avatar) || ''; }
  function coverUrl(user) { return user && (user['cover:url'] || user.coverUrl || user.cover || '') || ''; }

  function displayName(user) { return norm(user && (user.displayname || user.fullname || user.username || user.userslug)) || getPathSlug() || 'User'; }

  function firstLetter(user) {
    var txt = norm(user && (user['icon:text'] || user.username || user.userslug || displayName(user))) || '?';
    return txt.charAt(0).toUpperCase();
  }

  function normalizeArray(v) {
    if (Array.isArray(v)) return v.map(norm).filter(Boolean);
    var s = String(v || '').trim();
    if (!s || s === '[]' || s === 'null') return [];
    try {
      var parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(norm).filter(Boolean);
    } catch (e) {}
    return s.split(/[,，、|\/]+/).map(norm).filter(Boolean);
  }

  function languageCode(v) {
    var r = norm(v).toLowerCase();
    var map = {
      '中文': 'ZH', '汉语': 'ZH', '普通话': 'ZH', 'chinese': 'ZH', 'mandarin': 'ZH', 'zh': 'ZH', 'cn': 'CN',
      '英语': 'EN', '英文': 'EN', 'english': 'EN', 'en': 'EN',
      '缅甸语': 'MY', '缅语': 'MY', 'burmese': 'MY', 'myanmar': 'MY', 'my': 'MY', 'mm': 'MM',
      '泰语': 'TH', 'thai': 'TH', 'th': 'TH',
      '越南语': 'VI', 'vietnamese': 'VI', 'vi': 'VI', 'vn': 'VN',
      '日语': 'JA', 'japanese': 'JA', 'ja': 'JA', 'jp': 'JP',
      '韩语': 'KO', 'korean': 'KO', 'ko': 'KO', 'kr': 'KR',
      '法语': 'FR', 'french': 'FR', 'fr': 'FR',
      '德语': 'DE', 'german': 'DE', 'de': 'DE',
      '西班牙语': 'ES', 'spanish': 'ES', 'es': 'ES',
      '老挝语': 'LO', 'lao': 'LO', 'lo': 'LO',
      '高棉语': 'KM', 'khmer': 'KM', 'km': 'KM',
      '马来语': 'MS', 'malay': 'MS', 'ms': 'MS',
      '菲律宾语': 'TL', 'tagalog': 'TL', 'tl': 'TL'
    };
    if (map[r]) return map[r];
    if (/^[a-z]{2,4}$/i.test(r)) return r.toUpperCase();
    return norm(v).slice(0, 4).toUpperCase();
  }

  function languages(user) {
    var native = [].concat(
      normalizeArray(user.peipe_partner_native_languages),
      normalizeArray(user.language_fluent),
      normalizeArray(user.native_language),
      normalizeArray(user.language_native)
    );
    var learn = [].concat(
      normalizeArray(user.peipe_partner_learning_languages),
      normalizeArray(user.language_learning),
      normalizeArray(user.learning_language),
      normalizeArray(user.language_target)
    );
    native = uniq(native.map(languageCode).filter(Boolean)).slice(0, 3);
    learn = uniq(learn.map(languageCode).filter(Boolean)).slice(0, 5);
    return { native: native, learn: learn };
  }

  function uniq(arr) { return Array.from(new Set(arr)); }

  function birthdayAge(user) {
    var direct = user.age || user.peipe_partner_age;
    if (direct && Number(direct) > 0) return String(direct);
    var b = user.birthday || user.peipe_partner_birthday || user.birthdate;
    if (!b) return '';
    var date = new Date(b);
    if (isNaN(date.getTime())) return '';
    var now = new Date();
    var age = now.getFullYear() - date.getFullYear();
    var m = now.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < date.getDate())) age -= 1;
    return age > 0 && age < 120 ? String(age) : '';
  }

  function genderInfo(user) {
    var g = norm(user.gender || user.peipe_partner_gender).toLowerCase();
    if (g === 'male' || g === 'm' || g === '男') return { text: t('male'), symbol: '♂', cls: 'male' };
    if (g === 'female' || g === 'f' || g === '女') return { text: t('female'), symbol: '♀', cls: 'female' };
    if (g) return { text: t('secret'), symbol: '•', cls: 'secret' };
    return null;
  }

  function flagForCountry(raw) {
    raw = norm(raw).toLowerCase();
    if (!raw) return '';
    var pairs = [
      ['中国', '🇨🇳'], ['china', '🇨🇳'], ['cn', '🇨🇳'],
      ['缅甸', '🇲🇲'], ['myanmar', '🇲🇲'], ['burma', '🇲🇲'], ['mm', '🇲🇲'],
      ['越南', '🇻🇳'], ['vietnam', '🇻🇳'], ['vn', '🇻🇳'],
      ['泰国', '🇹🇭'], ['thailand', '🇹🇭'], ['th', '🇹🇭'],
      ['美国', '🇺🇸'], ['usa', '🇺🇸'], ['us', '🇺🇸'], ['united states', '🇺🇸'],
      ['英国', '🇬🇧'], ['uk', '🇬🇧'], ['gb', '🇬🇧'], ['united kingdom', '🇬🇧'],
      ['日本', '🇯🇵'], ['japan', '🇯🇵'], ['jp', '🇯🇵'],
      ['韩国', '🇰🇷'], ['korea', '🇰🇷'], ['kr', '🇰🇷'],
      ['老挝', '🇱🇦'], ['laos', '🇱🇦'], ['la', '🇱🇦'],
      ['柬埔寨', '🇰🇭'], ['cambodia', '🇰🇭'], ['kh', '🇰🇭'],
      ['马来西亚', '🇲🇾'], ['malaysia', '🇲🇾'], ['my', '🇲🇾'],
      ['菲律宾', '🇵🇭'], ['philippines', '🇵🇭'], ['ph', '🇵🇭'],
      ['新加坡', '🇸🇬'], ['singapore', '🇸🇬'], ['sg', '🇸🇬']
    ];
    for (var i = 0; i < pairs.length; i += 1) {
      if (raw === pairs[i][0] || raw.indexOf(pairs[i][0]) !== -1) return pairs[i][1];
    }
    return '';
  }

  function userCountry(user) { return norm(user.peipe_partner_country || user.country || user.nationality || user.language_flag || user.location); }

  function statValue(user, keys) {
    for (var i = 0; i < keys.length; i += 1) {
      var v = user[keys[i]];
      if (v !== undefined && v !== null && String(v) !== '') return v;
    }
    return 0;
  }

  function renderStars(value, editable) {
    value = Math.max(0, Math.min(5, Number(value || 0)));
    var html = '<div class="peipe-stars' + (editable ? ' is-editable' : '') + '">';
    for (var i = 1; i <= 5; i += 1) {
      html += '<button type="button" class="peipe-star' + (i <= value ? ' active' : '') + '" data-rating="' + i + '"' + (editable ? '' : ' disabled') + '>★</button>';
    }
    return html + '</div>';
  }

  function renderLangLine(user) {
    var l = languages(user);
    if (!l.native.length && !l.learn.length) return '';
    var left = l.native.join(' ');
    var right = l.learn.join(' ');
    return '<div class="peipe-language-line"><span>' + esc(left || t('nativeLang')) + '</span><i>⇄</i><span>' + esc(right || t('learningLang')) + '</span></div>';
  }

  function profileRows(user) {
    var rows = [];
    var country = userCountry(user);
    if (country) rows.push([t('country'), (flagForCountry(country) ? flagForCountry(country) + ' ' : '') + country]);
    var g = genderInfo(user);
    if (g) rows.push(['性别', g.symbol + ' ' + g.text]);
    var age = birthdayAge(user);
    if (age) rows.push(['年龄', age + '岁']);
    var height = user.peipe_partner_height || user.height;
    if (height) rows.push([t('height'), height + 'cm']);
    var weight = user.peipe_partner_weight || user.weight;
    if (weight) rows.push([t('weight'), weight + 'kg']);
    var edu = user.peipe_partner_education || user.education;
    if (edu) rows.push([t('education'), edu]);
    var job = user.peipe_partner_job || user.job || user.occupation;
    if (job) rows.push([t('job'), job]);
    var rels = user.peipe_partner_relationship || user.relationship;
    if (rels) rows.push([t('relationship'), rels]);
    return rows;
  }

  function tags(user) {
    return uniq([].concat(normalizeArray(user.peipe_partner_tags), normalizeArray(user.tags), normalizeArray(user.interests))).slice(0, 12);
  }

  function renderHeader() {
    var user = state.user || {};
    var avatar = avatarUrl(user);
    var cover = coverUrl(user);
    var country = userCountry(user);
    var flag = flagForCountry(country);
    var g = genderInfo(user);
    var age = birthdayAge(user);
    var bio = stripHtml(user.aboutme || user.bio || user.signature || state.root.getAttribute('data-about')) || '';
    var coverStyle = cover ? ' style="background-image:url(' + esc(cover) + ')"' : '';

    return '' +
      '<section class="peipe-xhs-hero">' +
        '<div class="peipe-xhs-cover"' + coverStyle + '></div>' +
        '<div class="peipe-xhs-shade"></div>' +
        '<div class="peipe-xhs-card">' +
          '<div class="peipe-xhs-main">' +
            '<div class="peipe-xhs-avatar">' +
              (avatar ? '<img src="' + esc(avatar) + '" alt="">' : '<span>' + esc(firstLetter(user)) + '</span>') +
              (flag ? '<em>' + flag + '</em>' : '') +
            '</div>' +
            '<div class="peipe-xhs-info">' +
              '<h1>' + esc(displayName(user)) + '</h1>' +
              '<div class="peipe-xhs-slug">@' + esc(user.userslug || user.username || getPathSlug()) + '</div>' +
              '<div class="peipe-xhs-mini">' +
                (g ? '<span class="gender ' + g.cls + '">' + g.symbol + '</span>' : '') +
                (age ? '<span>' + esc(age + '岁') + '</span>' : '') +
                (country ? '<span>' + esc(country) + '</span>' : '') +
              '</div>' +
              renderLangLine(user) +
            '</div>' +
          '</div>' +
          '<div class="peipe-xhs-stats">' +
            '<div><b>' + esc(statValue(user, ['reputation'])) + '</b><span>' + t('reputation') + '</span></div>' +
            '<div><b>' + esc(statValue(user, ['topiccount', 'topics'])) + '</b><span>' + t('topics') + '</span></div>' +
            '<div><b>' + esc(statValue(user, ['postcount', 'posts'])) + '</b><span>' + t('postsCount') + '</span></div>' +
            '<div><b>' + esc(statValue(user, ['followerCount', 'followers', 'followersCount'])) + '</b><span>' + t('followers') + '</span></div>' +
          '</div>' +
          '<p class="peipe-xhs-bio">' + esc(bio || t('bioEmpty')) + '</p>' +
        '</div>' +
      '</section>';
  }

  function renderTabs() {
    var tabs = [
      ['comments', t('comments'), '/user/' + encodeURIComponent(userSlug())],
      ['topics', t('posts'), '/user/' + encodeURIComponent(userSlug()) + '/topics'],
      ['profile', t('profile'), '/user/' + encodeURIComponent(userSlug()) + '/about']
    ];
    return '<nav class="peipe-profile-tabs">' + tabs.map(function (tab) {
      return '<button type="button" class="' + (state.activeTab === tab[0] ? 'active' : '') + '" data-tab="' + tab[0] + '" data-url="' + esc(rel(tab[2])) + '">' + esc(tab[1]) + '</button>';
    }).join('') + '</nav>';
  }

  function renderRatingSummary() {
    return '' +
      '<section class="peipe-rating-summary">' +
        '<div class="peipe-rating-number">' + Number(state.averageRating || 0).toFixed(1) + '</div>' +
        '<div class="peipe-rating-side">' +
          renderStars(Math.round(state.averageRating || 0), false) +
          '<span>' + Number(state.ratingCount || 0) + ' ' + t('scorePeople') + '</span>' +
        '</div>' +
      '</section>';
  }

  function renderCommentComposer() {
    var targetUid = Number(state.user && state.user.uid || 0);
    if (!currentUid()) return '<div class="peipe-note-card">' + t('loginToReview') + '</div>';
    if (!targetUid || isOwnProfile()) return '<div class="peipe-note-card">' + t('ownProfileNote') + '</div>';
    var old = state.viewerComment || {};
    var rating = Number(old.rating || state.currentRating || 5);
    return '' +
      '<section class="peipe-comment-compose">' +
        '<div class="peipe-compose-title">' + t('writeReview') + '</div>' +
        renderStars(rating, true) +
        '<textarea class="peipe-comment-input" maxlength="120" placeholder="' + esc(t('reviewPlaceholder')) + '">' + esc(old.content || '') + '</textarea>' +
        '<button type="button" class="peipe-comment-submit">' + (old.id ? t('updateReview') : t('submitReview')) + '</button>' +
        '<div class="peipe-comment-hint"></div>' +
      '</section>';
  }

  function renderCommentItem(item) {
    var avatar = item.authorAvatar || item.picture || '';
    var name = item.authorName || item.username || 'User';
    return '' +
      '<article class="peipe-comment-item">' +
        '<div class="peipe-comment-avatar">' + (avatar ? '<img src="' + esc(avatar) + '" alt="">' : '<span>' + esc(String(name).charAt(0).toUpperCase()) + '</span>') + '</div>' +
        '<div class="peipe-comment-body">' +
          '<div class="peipe-comment-head"><b>' + esc(name) + '</b>' + renderStars(item.rating || 0, false) + '</div>' +
          '<p>' + esc(item.content || '') + '</p>' +
        '</div>' +
      '</article>';
  }

  function renderCommentsTab() {
    var body = '';
    if (state.commentsLoading) body = '<div class="peipe-note-card">' + t('loadingComments') + '</div>';
    else if (state.commentsError) body = '<div class="peipe-note-card is-error">' + esc(state.commentsError) + '</div>';
    else if (!state.comments.length) body = '<div class="peipe-note-card">' + t('noComments') + '</div>';
    else body = '<section class="peipe-comments-list">' + state.comments.map(renderCommentItem).join('') + '</section>';
    return renderRatingSummary() + renderCommentComposer() + body;
  }

  function renderProfileTab() {
    var user = state.user || {};
    var rows = profileRows(user);
    var tagList = tags(user);
    var lang = languages(user);
    var html = '<section class="peipe-profile-info-card"><h2>' + t('partnerInfo') + '</h2>';
    html += '<div class="peipe-profile-grid">';
    if (lang.native.length) html += '<div><span>' + t('nativeLang') + '</span><b>' + esc(lang.native.join(' / ')) + '</b></div>';
    if (lang.learn.length) html += '<div><span>' + t('learningLang') + '</span><b>' + esc(lang.learn.join(' / ')) + '</b></div>';
    rows.forEach(function (r) { html += '<div><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>'; });
    html += '</div>';
    if (tagList.length) {
      html += '<h3>' + t('tags') + '</h3><div class="peipe-profile-tags">' + tagList.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>';
    }
    html += '</section>';
    return html;
  }

  function topicListFromPayload(json) {
    if (!json) return [];
    if (Array.isArray(json.topics)) return json.topics;
    if (json.user && Array.isArray(json.user.topics)) return json.user.topics;
    if (json.response && Array.isArray(json.response.topics)) return json.response.topics;
    if (Array.isArray(json)) return json;
    return [];
  }

  function renderTopicsTab() {
    if (state.topicsLoading) return '<div class="peipe-note-card">' + t('topicsLoading') + '</div>';
    if (state.topicsError) return '<div class="peipe-note-card is-error">' + t('topicsFail') + ' <a href="' + rel('/user/' + encodeURIComponent(userSlug()) + '/topics') + '">' + t('openOriginal') + '</a></div>';
    if (!state.topics.length) return '<div class="peipe-note-card">' + t('topicsEmpty') + '</div>';
    return '<section class="peipe-topic-grid">' + state.topics.map(function (topic) {
      var title = topic.titleRaw || topic.title || topic.topicTitle || 'Untitled';
      var url = topic.slug ? '/topic/' + topic.slug : (topic.tid ? '/topic/' + topic.tid : '#');
      var teaser = stripHtml(topic.teaser && topic.teaser.content || topic.content || topic.mainPost && topic.mainPost.content || '');
      var img = '';
      var m = String(topic.content || topic.mainPost && topic.mainPost.content || '').match(/<img[^>]+src=["']([^"']+)/i);
      if (m) img = m[1];
      return '<a class="peipe-topic-card" href="' + rel(url) + '">' + (img ? '<img src="' + esc(img) + '" alt="">' : '<div class="peipe-topic-empty-img"></div>') + '<b>' + esc(title) + '</b>' + (teaser ? '<p>' + esc(teaser.slice(0, 70)) + '</p>' : '') + '</a>';
    }).join('') + '</section>';
  }

  function render() {
    if (!state.root) return;
    state.root.innerHTML = '<div class="peipe-profile-shell">' + renderHeader() + renderTabs() + '<main class="peipe-profile-content">' + (state.activeTab === 'comments' ? renderCommentsTab() : (state.activeTab === 'topics' ? renderTopicsTab() : renderProfileTab())) + '</main></div>';
    bindUi();
  }

  function bindUi() {
    $$('.peipe-profile-tabs button', state.root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tab = btn.getAttribute('data-tab') || 'comments';
        state.activeTab = tab;
        var url = btn.getAttribute('data-url');
        if (url && history.pushState) history.pushState({}, '', url);
        render();
        if (tab === 'topics' && !state.topicsLoaded && !state.topicsLoading) loadTopics();
        if (tab === 'comments' && !state.commentsLoaded && !state.commentsLoading) loadComments();
      });
    });

    $$('.peipe-comment-compose .peipe-star', state.root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.currentRating = Number(btn.getAttribute('data-rating') || 5);
        var wrap = btn.closest('.peipe-stars');
        $$('.peipe-star', wrap).forEach(function (star) {
          star.classList.toggle('active', Number(star.getAttribute('data-rating') || 0) <= state.currentRating);
        });
      });
    });

    var submit = $('.peipe-comment-submit', state.root);
    if (submit) submit.addEventListener('click', submitComment);
  }

  function handleCommentError(err) {
    if (err && err.status === 404) return t('commentsApiMissing');
    if (err && err.status === 403) return (err.message && err.message.indexOf('HTTP') !== 0 ? err.message : t('commentLocked')) || t('commentLocked');
    return err && err.message ? err.message : t('commentFail');
  }

  function submitComment() {
    var submit = $('.peipe-comment-submit', state.root);
    var hint = $('.peipe-comment-hint', state.root);
    var input = $('.peipe-comment-input', state.root);
    var targetUid = Number(state.user && state.user.uid || 0);
    var content = norm(input && input.value);
    var rating = Math.max(1, Math.min(5, Number(state.currentRating || 5)));
    if (!content) { if (hint) hint.textContent = t('reviewPlaceholder'); return; }
    if (!targetUid) return;
    submit.disabled = true;
    submit.textContent = '...';
    if (hint) hint.textContent = '';
    apiFetch('/api/peipe-partners/profile/' + encodeURIComponent(targetUid) + '/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8', 'x-csrf-token': csrfToken() },
      body: JSON.stringify({ rating: rating, content: content })
    }).then(function () {
      state.commentsLoaded = false;
      return loadComments();
    }).catch(function (err) {
      if (hint) hint.textContent = handleCommentError(err);
    }).finally(function () {
      submit.disabled = false;
      submit.textContent = state.viewerComment && state.viewerComment.id ? t('updateReview') : t('submitReview');
    });
  }

  function loadComments() {
    var uid = Number(state.user && state.user.uid || 0);
    if (!uid) return Promise.resolve();
    state.commentsLoading = true;
    state.commentsError = '';
    render();
    return apiFetch('/api/peipe-partners/profile/' + encodeURIComponent(uid) + '/comments?limit=50').then(function (json) {
      state.comments = json.comments || [];
      state.viewerComment = json.viewerComment || null;
      state.averageRating = Number(json.averageRating || 0);
      state.ratingCount = Number(json.ratingCount || 0);
      if (state.viewerComment && state.viewerComment.rating) state.currentRating = Number(state.viewerComment.rating || 5);
      state.commentsLoaded = true;
    }).catch(function (err) {
      state.commentsError = handleCommentError(err);
      state.comments = [];
      state.averageRating = 0;
      state.ratingCount = 0;
      state.commentsLoaded = false;
    }).finally(function () {
      state.commentsLoading = false;
      render();
    });
  }

  function loadTopics() {
    var slug = userSlug();
    if (!slug) return Promise.resolve();
    state.topicsLoading = true;
    state.topicsError = '';
    render();
    return apiFetch('/api/user/' + encodeURIComponent(slug) + '/topics').then(function (json) {
      state.topics = topicListFromPayload(json).slice(0, 24);
      state.topicsLoaded = true;
    }).catch(function (err) {
      state.topicsError = err && err.message || 'failed';
      state.topics = [];
      state.topicsLoaded = false;
    }).finally(function () {
      state.topicsLoading = false;
      render();
    });
  }

  function refreshUserInBackground() {
    var slug = userSlug();
    if (!slug) return;
    apiFetch('/api/user/' + encodeURIComponent(slug)).then(function (json) {
      var user = json.user || json;
      state.user = mergeUser(state.user, user);
      render();
      if (state.activeTab === 'topics' && !state.topicsLoaded && !state.topicsLoading) loadTopics();
    }).catch(function () {});
  }

  function init() {
    var root = document.getElementById('peipe-profile-app');
    if (!root) {
      document.body.classList.remove('peipe-profile-mode');
      return;
    }
    state.root = root;
    state.user = collectInitialUser(root);
    state.activeTab = getPathTab(root.getAttribute('data-default-tab') || 'comments');
    state.commentsLoaded = false;
    state.commentsLoading = false;
    state.commentsError = '';
    state.topicsLoaded = false;
    state.topicsLoading = false;
    state.topicsError = '';
    document.body.classList.add('peipe-profile-mode');
    render();
    refreshUserInBackground();
    if (state.activeTab === 'comments') loadComments();
    if (state.activeTab === 'topics') loadTopics();
  }

  function bindNodebbEvents() {
    if (window.jQuery) {
      window.jQuery(window).off('action:ajaxify.end.peipeProfileV16 action:ajaxify.start.peipeProfileV16')
        .on('action:ajaxify.start.peipeProfileV16', function () { document.body.classList.remove('peipe-profile-mode'); })
        .on('action:ajaxify.end.peipeProfileV16', function () { setTimeout(init, 30); });
    }
    window.addEventListener('popstate', function () {
      if (!state.root) return;
      state.activeTab = getPathTab('comments');
      render();
      if (state.activeTab === 'topics' && !state.topicsLoaded && !state.topicsLoading) loadTopics();
      if (state.activeTab === 'comments' && !state.commentsLoaded && !state.commentsLoading) loadComments();
    });
  }

  bindNodebbEvents();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
