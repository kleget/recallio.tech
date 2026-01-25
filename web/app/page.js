"use client";

import { useEffect, useMemo, useState } from "react";

import { getCookie, setCookie } from "./lib/client-cookies";
import TourOverlay from "./tour-overlay";
import { useUiLang } from "./ui-lang-context";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const TEXT = {
  ru: {
    title: "ÃÂ¡ÃÂµÃÂ³ÃÂ¾ÃÂ´ÃÂ½Ã‘Â",
    tagline: "ÃÂ¢ÃÂ²ÃÂ¾ÃÂ¹ ÃÂ¿ÃÂ»ÃÂ°ÃÂ½ ÃÂ½ÃÂ° ÃÂ´ÃÂµÃÂ½Ã‘Å’ ÃÂ¿ÃÂ¾ Ã‘Æ’Ã‘â€¡Ã‘â€˜ÃÂ±ÃÂµ.",
    loading: "Ãâ€”ÃÂ°ÃÂ³Ã‘â‚¬Ã‘Æ’ÃÂ·ÃÂºÃÂ°...",
    stats: {
      known: "ÃÂ¡ÃÂ»ÃÂ¾ÃÂ² ÃÂ·ÃÂ½ÃÂ°Ã‘Å½",
      days: "Ãâ€ÃÂ½ÃÂµÃÂ¹ Ã‘Æ’Ã‘â€¡ÃÂ¸ÃÂ¼Ã‘ÂÃ‘Â",
      learnToday: "ÃÂ£Ã‘â€¡ÃÂ¸Ã‘â€šÃ‘Å’",
      reviewToday: "ÃÅ¸ÃÂ¾ÃÂ²Ã‘â€šÃÂ¾Ã‘â‚¬Ã‘ÂÃ‘â€šÃ‘Å’",
      readingToday: "ÃÂ§ÃÂ¸Ã‘â€šÃÂ°Ã‘â€šÃ‘Å’",
      availableLearn: "ÃÅ¡ ÃÂ¾ÃÂ±Ã‘Æ’Ã‘â€¡ÃÂµÃÂ½ÃÂ¸Ã‘Å½",
      availableReview: "ÃÅ¡ ÃÂ¿ÃÂ¾ÃÂ²Ã‘â€šÃÂ¾Ã‘â‚¬Ã‘Æ’"
    },
    today: "ÃÂ¡ÃÂµÃÂ³ÃÂ¾ÃÂ´ÃÂ½Ã‘Â",
    learnButton: "ÃÂ£Ã‘â€¡ÃÂ¸Ã‘â€šÃ‘Å’",
    reviewButton: "ÃÅ¸ÃÂ¾ÃÂ²Ã‘â€šÃÂ¾Ã‘â‚¬Ã‘ÂÃ‘â€šÃ‘Å’",
    chartTitle: "Ãâ€œÃ‘â‚¬ÃÂ°Ã‘â€žÃÂ¸ÃÂº ÃÂ´ÃÂ¸Ã‘ÂÃ‘â€ ÃÂ¸ÃÂ¿ÃÂ»ÃÂ¸ÃÂ½Ã‘â€¹",
    chartDesc:
      "ÃÅ¾Ã‘ÂÃ‘Å’ X Ã¢â‚¬â€ ÃÂ²Ã‘â‚¬ÃÂµÃÂ¼Ã‘Â, ÃÂ¾Ã‘ÂÃ‘Å’ Y Ã¢â‚¬â€ Ã‘ÂÃÂºÃÂ¾ÃÂ»Ã‘Å’ÃÂºÃÂ¾ Ã‘ÂÃÂ»ÃÂ¾ÃÂ² ÃÂ²Ã‘â€¹ ÃÂ·ÃÂ½ÃÂ°ÃÂµÃ‘â€šÃÂµ. Ãâ€ÃÂ°ÃÂ¶ÃÂµ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ° Ã‘ÂÃÂ»ÃÂ¾ÃÂ² ÃÂ² ÃÂ´ÃÂµÃÂ½Ã‘Å’ ÃÂ¿Ã‘â‚¬ÃÂµÃÂ²Ã‘â‚¬ÃÂ°Ã‘â€°ÃÂ°ÃÂµÃ‘â€šÃ‘ÂÃ‘Â ÃÂ² ÃÂ·ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃÂ½Ã‘â€¹ÃÂ¹ Ã‘â‚¬ÃÂ¾Ã‘ÂÃ‘â€š.",
    chartNoData: "ÃÅ¸ÃÂ¾ÃÂºÃÂ° ÃÂ½ÃÂµÃ‘â€š ÃÂ´ÃÂ°ÃÂ½ÃÂ½Ã‘â€¹Ã‘â€¦ ÃÂ´ÃÂ»Ã‘Â ÃÂ³Ã‘â‚¬ÃÂ°Ã‘â€žÃÂ¸ÃÂºÃÂ°. ÃÂÃÂ°Ã‘â€¡ÃÂ½ÃÂ¸ Ã‘Æ’Ã‘â€¡ÃÂ¸Ã‘â€šÃ‘Å’ Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂ°.",
    chartStart: "Ãâ€˜Ã‘â€¹ÃÂ»ÃÂ¾",
    chartNow: "ÃÂ¡ÃÂµÃÂ¹Ã‘â€¡ÃÂ°Ã‘Â",
    chartDelta: "ÃÂ·ÃÂ°",
    langRu: "ÃÂ Ã‘Æ’Ã‘ÂÃ‘ÂÃÂºÃÂ¸ÃÂ¹",
    langEn: "English",
    chartAria: "Ãâ€œÃ‘â‚¬ÃÂ°Ã‘â€žÃÂ¸ÃÂº ÃÂºÃÂ¾ÃÂ»ÃÂ¸Ã‘â€¡ÃÂµÃ‘ÂÃ‘â€šÃÂ²ÃÂ° ÃÂ²Ã‘â€¹Ã‘Æ’Ã‘â€¡ÃÂµÃÂ½ÃÂ½Ã‘â€¹Ã‘â€¦ Ã‘ÂÃÂ»ÃÂ¾ÃÂ²",
    chartRanges: {
      week: "7 ÃÂ´ÃÂ½ÃÂµÃÂ¹",
      twoWeeks: "2 ÃÂ½ÃÂµÃÂ´ÃÂµÃÂ»ÃÂ¸",
      month: "ÃÅ“ÃÂµÃ‘ÂÃ‘ÂÃ‘â€ ",
      all: "Ãâ€™Ã‘ÂÃÂµ ÃÂ²Ã‘â‚¬ÃÂµÃÂ¼Ã‘Â"
    },
    tips: {
      title: "ÃÅ¡ÃÂ°ÃÂº Ã‘Æ’Ã‘â€¡ÃÂ¸Ã‘â€šÃ‘Å’ Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂ° Ã‘ÂÃ‘â€žÃ‘â€žÃÂµÃÂºÃ‘â€šÃÂ¸ÃÂ²ÃÂ½ÃÂµÃÂµ",
      intro: "ÃÅ¡ÃÂ¾Ã‘â‚¬ÃÂ¾Ã‘â€šÃÂºÃÂ¸ÃÂµ ÃÂ¼ÃÂµÃ‘â€šÃÂ¾ÃÂ´Ã‘â€¹, ÃÂºÃÂ¾Ã‘â€šÃÂ¾Ã‘â‚¬Ã‘â€¹ÃÂµ Ã‘â‚¬ÃÂµÃÂ°ÃÂ»Ã‘Å’ÃÂ½ÃÂ¾ Ã‘â‚¬ÃÂ°ÃÂ±ÃÂ¾Ã‘â€šÃÂ°Ã‘Å½Ã‘â€š.",
      items: [
        {
          title: "ÃÅ“ÃÂµÃ‘â€šÃÂ¾ÃÂ´ 7 Ã‘ÂÃ‘â€šÃ‘â‚¬ÃÂ¾ÃÂº (ÃÂ»ÃÂ¸Ã‘ÂÃ‘â€šÃÂ¾ÃÂº + Ã‘â‚¬Ã‘Æ’Ã‘â€¡ÃÂºÃÂ°)",
          desc: "ÃÅ¸ÃÂ¸Ã‘Ë†ÃÂ¸ Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂ¾-ÃÂ¿ÃÂµÃ‘â‚¬ÃÂµÃÂ²ÃÂ¾ÃÂ´ 7 Ã‘ÂÃ‘â€šÃ‘â‚¬ÃÂ¾ÃÂº Ã‘â‚¬Ã‘Æ’Ã‘â€¡ÃÂºÃÂ¾ÃÂ¹ ÃÂ½ÃÂ° ÃÂ»ÃÂ¸Ã‘ÂÃ‘â€šÃÂ¾Ã‘â€¡ÃÂºÃÂµ ÃÂ¸ ÃÂ¿Ã‘â‚¬ÃÂ¾ÃÂ³ÃÂ¾ÃÂ²ÃÂ°Ã‘â‚¬ÃÂ¸ÃÂ²ÃÂ°ÃÂ¹. ÃÂ¢ÃÂ°ÃÂº ÃÂ·ÃÂ°ÃÂ¿ÃÂ¾ÃÂ¼ÃÂ¸ÃÂ½ÃÂ°ÃÂµÃ‘â€šÃ‘ÂÃ‘Â ÃÂ¸ ÃÂ¿Ã‘â‚¬ÃÂ¾ÃÂ¸ÃÂ·ÃÂ½ÃÂ¾Ã‘Ë†ÃÂµÃÂ½ÃÂ¸ÃÂµ, ÃÂ¸ ÃÂ¿Ã‘â‚¬ÃÂ°ÃÂ²ÃÂ¸ÃÂ»Ã‘Å’ÃÂ½ÃÂ¾ÃÂµ ÃÂ½ÃÂ°ÃÂ¿ÃÂ¸Ã‘ÂÃÂ°ÃÂ½ÃÂ¸ÃÂµ, ÃÂ¸ ÃÂ¿ÃÂµÃ‘â‚¬ÃÂµÃÂ²ÃÂ¾ÃÂ´."
        },
        {
          title: "ÃÅ¡ÃÂ°Ã‘â‚¬Ã‘â€šÃÂ¾Ã‘â€¡ÃÂºÃÂ¸ ÃÂ¸ ÃÂ°ÃÂºÃ‘â€šÃÂ¸ÃÂ²ÃÂ½ÃÂ¾ÃÂµ ÃÂ²Ã‘ÂÃÂ¿ÃÂ¾ÃÂ¼ÃÂ¸ÃÂ½ÃÂ°ÃÂ½ÃÂ¸ÃÂµ",
          desc: "ÃÂ¡ÃÂ½ÃÂ°Ã‘â€¡ÃÂ°ÃÂ»ÃÂ° ÃÂ¿ÃÂ¾ÃÂ¿Ã‘â‚¬ÃÂ¾ÃÂ±Ã‘Æ’ÃÂ¹ ÃÂ²Ã‘ÂÃÂ¿ÃÂ¾ÃÂ¼ÃÂ½ÃÂ¸Ã‘â€šÃ‘Å’ ÃÂ¿ÃÂµÃ‘â‚¬ÃÂµÃÂ²ÃÂ¾ÃÂ´, ÃÂ·ÃÂ°Ã‘â€šÃÂµÃÂ¼ ÃÂ¿Ã‘â‚¬ÃÂ¾ÃÂ²ÃÂµÃ‘â‚¬Ã‘Å’ Ã‘ÂÃÂµÃÂ±Ã‘Â. ÃÅ¾Ã‘Ë†ÃÂ¸ÃÂ±ÃÂºÃÂ¸ Ã‘Æ’Ã‘ÂÃÂºÃÂ¾Ã‘â‚¬Ã‘ÂÃ‘Å½Ã‘â€š ÃÂ·ÃÂ°ÃÂ¿ÃÂ¾ÃÂ¼ÃÂ¸ÃÂ½ÃÂ°ÃÂ½ÃÂ¸ÃÂµ."
        },
        {
          title: "ÃÅ¡ÃÂ¾ÃÂ½Ã‘â€šÃÂµÃÂºÃ‘ÂÃ‘â€š",
          desc: "Ãâ€ÃÂ¾ÃÂ±ÃÂ°ÃÂ²ÃÂ»Ã‘ÂÃÂ¹ ÃÂºÃÂ¾Ã‘â‚¬ÃÂ¾Ã‘â€šÃÂºÃÂ¸ÃÂ¹ ÃÂ¿Ã‘â‚¬ÃÂ¸ÃÂ¼ÃÂµÃ‘â‚¬ ÃÂ¸ÃÂ»ÃÂ¸ Ã‘â€žÃ‘â‚¬ÃÂ°ÃÂ·Ã‘Æ’ Ã¢â‚¬â€ Ã‘â€šÃÂ°ÃÂº Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂ¾ Ã‘â€ ÃÂµÃÂ¿ÃÂ»Ã‘ÂÃÂµÃ‘â€šÃ‘ÂÃ‘Â Ã‘ÂÃÂ¸ÃÂ»Ã‘Å’ÃÂ½ÃÂµÃÂµ."
        }
      ]
    },
    sections: {
      title: "ÃÂ ÃÂ°ÃÂ·ÃÂ´ÃÂµÃÂ»Ã‘â€¹",
      weakTitle: "ÃÂ¡ÃÂ»ÃÂ°ÃÂ±Ã‘â€¹ÃÂµ Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂ°",
      weakDesc: "ÃÂ¡ÃÂ»ÃÂ¾ÃÂ²ÃÂ°, ÃÂ² ÃÂºÃÂ¾Ã‘â€šÃÂ¾Ã‘â‚¬Ã‘â€¹Ã‘â€¦ Ã‘â€¡ÃÂ°Ã‘â€°ÃÂµ ÃÂ²Ã‘ÂÃÂµÃÂ³ÃÂ¾ ÃÂ¾Ã‘Ë†ÃÂ¸ÃÂ±ÃÂ°ÃÂµÃ‘Ë†Ã‘Å’Ã‘ÂÃ‘Â.",
      planTitle: "ÃÅ¸ÃÂ»ÃÂ°ÃÂ½ ÃÂ¿ÃÂ¾ÃÂ²Ã‘â€šÃÂ¾Ã‘â‚¬ÃÂµÃÂ½ÃÂ¸ÃÂ¹",
      planDesc: "ÃÅ¡ÃÂ¾ÃÂ³ÃÂ´ÃÂ° ÃÂ¸ ÃÂºÃÂ°ÃÂºÃÂ¸ÃÂµ Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂ° ÃÂ±Ã‘Æ’ÃÂ´Ã‘Æ’Ã‘â€š ÃÂ¿ÃÂ¾ÃÂ²Ã‘â€šÃÂ¾Ã‘â‚¬Ã‘ÂÃ‘â€šÃ‘Å’Ã‘ÂÃ‘Â.",
      knownTitle: "ÃËœÃÂ·ÃÂ²ÃÂµÃ‘ÂÃ‘â€šÃÂ½Ã‘â€¹ÃÂµ Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂ°",
      knownDesc: "ÃËœÃÂ¼ÃÂ¿ÃÂ¾Ã‘â‚¬Ã‘â€š Ã‘ÂÃÂ»ÃÂ¾ÃÂ², ÃÂºÃÂ¾Ã‘â€šÃÂ¾Ã‘â‚¬Ã‘â€¹ÃÂµ Ã‘â€šÃ‘â€¹ Ã‘Æ’ÃÂ¶ÃÂµ ÃÂ·ÃÂ½ÃÂ°ÃÂµÃ‘Ë†Ã‘Å’.",
      customTitle: "ÃÅ“ÃÂ¾ÃÂ¸ Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂ°",
      customDesc: "Ãâ€ºÃÂ¸Ã‘â€¡ÃÂ½Ã‘â€¹ÃÂ¹ Ã‘ÂÃÂ¿ÃÂ¸Ã‘ÂÃÂ¾ÃÂº Ã‘ÂÃÂ»ÃÂ¾ÃÂ² ÃÂ´ÃÂ»Ã‘Â ÃÂ¸ÃÂ·Ã‘Æ’Ã‘â€¡ÃÂµÃÂ½ÃÂ¸Ã‘Â.",
      reportTitle: "ÃÂ¡ÃÂ¾ÃÂ¾ÃÂ±Ã‘â€°ÃÂ¸Ã‘â€šÃ‘Å’ ÃÂ¾ ÃÂ¿Ã‘â‚¬ÃÂ¾ÃÂ±ÃÂ»ÃÂµÃÂ¼ÃÂµ",
      reportDesc: "ÃÂ¡ÃÂ¾ÃÂ¾ÃÂ±Ã‘â€°ÃÂ¸Ã‘â€šÃ‘Å’ ÃÂ¾ÃÂ± ÃÂ¾Ã‘Ë†ÃÂ¸ÃÂ±ÃÂºÃÂµ ÃÂ² Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂµ ÃÂ¸ÃÂ»ÃÂ¸ ÃÂ¿ÃÂµÃ‘â‚¬ÃÂµÃÂ²ÃÂ¾ÃÂ´ÃÂµ.",
      helpTitle: "ÃËœÃÂ½Ã‘ÂÃ‘â€šÃ‘â‚¬Ã‘Æ’ÃÂºÃ‘â€ ÃÂ¸Ã‘Â",
      helpDesc: "ÃÅ¸ÃÂ¾ÃÂ´Ã‘ÂÃÂºÃÂ°ÃÂ·ÃÂºÃÂ¸ ÃÂ¸ ÃÂ±Ã‘â€¹Ã‘ÂÃ‘â€šÃ‘â‚¬Ã‘â€¹ÃÂ¹ Ã‘â€šÃ‘Æ’Ã‘â‚¬ ÃÂ¿ÃÂ¾ Ã‘ÂÃÂµÃ‘â‚¬ÃÂ²ÃÂ¸Ã‘ÂÃ‘Æ’."
    },
    tour: {
      title: "Ãâ€˜Ã‘â€¹Ã‘ÂÃ‘â€šÃ‘â‚¬Ã‘â€¹ÃÂ¹ Ã‘â€šÃ‘Æ’Ã‘â‚¬",
      stepLabel: "ÃÂ¨ÃÂ°ÃÂ³",
      back: "ÃÂÃÂ°ÃÂ·ÃÂ°ÃÂ´",
      next: "Ãâ€ÃÂ°ÃÂ»ÃÂµÃÂµ",
      done: "ÃÅ¡ Ã‘ÂÃÂ¾ÃÂ¾ÃÂ±Ã‘â€°ÃÂµÃ‘ÂÃ‘â€šÃÂ²Ã‘Æ’",
      skip: "Ãâ€”ÃÂ°ÃÂ²ÃÂµÃ‘â‚¬Ã‘Ë†ÃÂ¸Ã‘â€šÃ‘Å’",
      steps: [
        {
          key: "stats",
          title: "ÃÂ¡Ã‘â€šÃÂ°Ã‘â€šÃÂ¸Ã‘ÂÃ‘â€šÃÂ¸ÃÂºÃÂ°",
          desc: "ÃÂ¡ÃÂºÃÂ¾ÃÂ»Ã‘Å’ÃÂºÃÂ¾ Ã‘ÂÃÂ»ÃÂ¾ÃÂ² ÃÂ²Ã‘â€¹Ã‘Æ’Ã‘â€¡ÃÂµÃÂ½ÃÂ¾ ÃÂ¸ Ã‘ÂÃÂºÃÂ¾ÃÂ»Ã‘Å’ÃÂºÃÂ¾ ÃÂ´ÃÂ½ÃÂµÃÂ¹ Ã‘Æ’Ã‘â€¡ÃÂ¸Ã‘Ë†Ã‘Å’Ã‘ÂÃ‘Â.",
          mobileDesc:
            "Ãâ€”ÃÂ´ÃÂµÃ‘ÂÃ‘Å’ ÃÂ²ÃÂ¸ÃÂ´ÃÂ½ÃÂ¾ ÃÂ¾ÃÂ±Ã‘â€°ÃÂ¸ÃÂ¹ ÃÂ¿Ã‘â‚¬ÃÂ¾ÃÂ³Ã‘â‚¬ÃÂµÃ‘ÂÃ‘Â: Ã‘ÂÃÂºÃÂ¾ÃÂ»Ã‘Å’ÃÂºÃÂ¾ Ã‘ÂÃÂ»ÃÂ¾ÃÂ² Ã‘â€šÃ‘â€¹ ÃÂ·ÃÂ½ÃÂ°ÃÂµÃ‘Ë†Ã‘Å’, Ã‘ÂÃÂºÃÂ¾ÃÂ»Ã‘Å’ÃÂºÃÂ¾ ÃÂ´ÃÂ½ÃÂµÃÂ¹ Ã‘Æ’Ã‘â€¡ÃÂ¸Ã‘Ë†Ã‘Å’Ã‘ÂÃ‘Â ÃÂ¸ ÃÂ´ÃÂ½ÃÂµÃÂ²ÃÂ½Ã‘â€¹ÃÂµ Ã‘â€ ÃÂµÃÂ»ÃÂ¸."
        },
        {
          key: "today",
          title: "ÃÂ¡ÃÂµÃÂ³ÃÂ¾ÃÂ´ÃÂ½Ã‘Â",
          desc: "Ãâ€”ÃÂ°ÃÂ¿Ã‘Æ’Ã‘ÂÃÂº ÃÂ¾ÃÂ±Ã‘Æ’Ã‘â€¡ÃÂµÃÂ½ÃÂ¸Ã‘Â ÃÂ¸ ÃÂ¿ÃÂ¾ÃÂ²Ã‘â€šÃÂ¾Ã‘â‚¬ÃÂµÃÂ½ÃÂ¸Ã‘Â ÃÂ½ÃÂ° Ã‘ÂÃÂµÃÂ³ÃÂ¾ÃÂ´ÃÂ½Ã‘Â.",
          mobileDesc:
            "ÃÅ¡ÃÂ½ÃÂ¾ÃÂ¿ÃÂºÃÂ¸ ÃÂ·ÃÂ°ÃÂ¿Ã‘Æ’Ã‘ÂÃÂºÃÂ°Ã‘Å½Ã‘â€š ÃÂ¾ÃÂ±Ã‘Æ’Ã‘â€¡ÃÂµÃÂ½ÃÂ¸ÃÂµ ÃÂ¸ ÃÂ¿ÃÂ¾ÃÂ²Ã‘â€šÃÂ¾Ã‘â‚¬ÃÂµÃÂ½ÃÂ¸ÃÂµ ÃÂ½ÃÂ° Ã‘ÂÃÂµÃÂ³ÃÂ¾ÃÂ´ÃÂ½Ã‘Â. ÃÂ§ÃÂ¸Ã‘ÂÃÂ»ÃÂ¾ Ã‘â‚¬Ã‘ÂÃÂ´ÃÂ¾ÃÂ¼ Ã¢â‚¬â€ Ã‘ÂÃÂºÃÂ¾ÃÂ»Ã‘Å’ÃÂºÃÂ¾ Ã‘ÂÃÂ»ÃÂ¾ÃÂ² ÃÂ·ÃÂ°ÃÂ¿ÃÂ»ÃÂ°ÃÂ½ÃÂ¸Ã‘â‚¬ÃÂ¾ÃÂ²ÃÂ°ÃÂ½ÃÂ¾."
        },
        {
          key: "sections",
          title: "ÃÂ ÃÂ°ÃÂ·ÃÂ´ÃÂµÃÂ»Ã‘â€¹",
          desc: "ÃÂ¡ÃÂ»ÃÂ°ÃÂ±Ã‘â€¹ÃÂµ Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂ°, Ã‘ÂÃÂ²ÃÂ¾ÃÂ¸ Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂ° ÃÂ¸ Ã‘ÂÃÂ¾ÃÂ¾ÃÂ±Ã‘â€°ÃÂµÃÂ½ÃÂ¸Ã‘Â ÃÂ¾ÃÂ± ÃÂ¾Ã‘Ë†ÃÂ¸ÃÂ±ÃÂºÃÂ°Ã‘â€¦.",
          mobileDesc:
            "Ãâ€˜Ã‘â€¹Ã‘ÂÃ‘â€šÃ‘â‚¬Ã‘â€¹ÃÂ¹ ÃÂ´ÃÂ¾Ã‘ÂÃ‘â€šÃ‘Æ’ÃÂ¿ ÃÂº Ã‘ÂÃÂ»ÃÂ°ÃÂ±Ã‘â€¹ÃÂ¼ Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂ°ÃÂ¼, Ã‘â€šÃÂ²ÃÂ¾ÃÂ¸ÃÂ¼ Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂ°ÃÂ¼ ÃÂ¸ Ã‘â‚¬ÃÂµÃÂ¿ÃÂ¾Ã‘â‚¬Ã‘â€šÃÂ°ÃÂ¼. Ãâ€”ÃÂ´ÃÂµÃ‘ÂÃ‘Å’ ÃÂ¶ÃÂµ ÃÂ¸ÃÂ½Ã‘ÂÃ‘â€šÃ‘â‚¬Ã‘Æ’ÃÂºÃ‘â€ ÃÂ¸Ã‘Â ÃÂ¿ÃÂ¾ Ã‘ÂÃÂµÃ‘â‚¬ÃÂ²ÃÂ¸Ã‘ÂÃ‘Æ’."
        },
        {
          key: "chart",
          title: "Ãâ€œÃ‘â‚¬ÃÂ°Ã‘â€žÃÂ¸ÃÂº ÃÂ´ÃÂ¸Ã‘ÂÃ‘â€ ÃÂ¸ÃÂ¿ÃÂ»ÃÂ¸ÃÂ½Ã‘â€¹",
          desc: "ÃÂ ÃÂ¾Ã‘ÂÃ‘â€š Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂ°Ã‘â‚¬Ã‘Â ÃÂ¿ÃÂ¾ ÃÂ´ÃÂ½Ã‘ÂÃÂ¼.",
          mobileDesc:
            "Ãâ€œÃ‘â‚¬ÃÂ°Ã‘â€žÃÂ¸ÃÂº ÃÂ¿ÃÂ¾ÃÂºÃÂ°ÃÂ·Ã‘â€¹ÃÂ²ÃÂ°ÃÂµÃ‘â€š Ã‘â‚¬ÃÂ¾Ã‘ÂÃ‘â€š Ã‘ÂÃÂ»ÃÂ¾ÃÂ²ÃÂ°Ã‘â‚¬ÃÂ½ÃÂ¾ÃÂ³ÃÂ¾ ÃÂ·ÃÂ°ÃÂ¿ÃÂ°Ã‘ÂÃÂ° ÃÂ¿ÃÂ¾ ÃÂ´ÃÂ½Ã‘ÂÃÂ¼, Ã‘â€¡Ã‘â€šÃÂ¾ÃÂ±Ã‘â€¹ ÃÂ²ÃÂ¸ÃÂ´ÃÂµÃ‘â€šÃ‘Å’ ÃÂ´ÃÂ¸Ã‘ÂÃ‘â€ ÃÂ¸ÃÂ¿ÃÂ»ÃÂ¸ÃÂ½Ã‘Æ’ ÃÂ¸ Ã‘â€šÃÂµÃÂ¼ÃÂ¿."
        }
      ]
    }
},
  en: {
    title: "Today",
    tagline: "Your daily learning plan.",
    loading: "Loading...",
    stats: {
      known: "Words known",
      days: "Days learning",
      learnToday: "Learn",
      reviewToday: "Review",
      readingToday: "Read",
      availableLearn: "To learn",
      availableReview: "To review"
    },
    today: "Today",
    learnButton: "Learn",
    reviewButton: "Review",
    chartTitle: "Discipline chart",
    chartDesc:
      "X axis is time, Y axis is how many words you know. Even a few words a day add up quickly.",
    chartNoData: "No data yet. Start learning words.",
    chartStart: "Start",
    chartNow: "Now",
    chartDelta: "in",
    langRu: "ÃÂ Ã‘Æ’Ã‘ÂÃ‘ÂÃÂºÃÂ¸ÃÂ¹",
    langEn: "English",
    chartAria: "Chart of learned words",
    chartRanges: {
      week: "7 days",
      twoWeeks: "2 weeks",
      month: "Month",
      all: "All time"
    },
    tips: {
      title: "How to learn words effectively",
      intro: "Short methods that work in practice.",
      items: [
        {
          title: "7-line method (paper + pen)",
          desc: "Write word-translation pairs in 7 lines by hand and say them aloud. It helps pronunciation, spelling, and recall."
        },
        {
          title: "Flashcards and active recall",
          desc: "Try to recall first, then check. Errors help memory stick faster."
        },
        {
          title: "Context",
          desc: "Add a short example phrase so the word sticks in real usage."
        }
      ]
    },
    sections: {
      title: "Sections",
      weakTitle: "Weak words",
      weakDesc: "Words where you make the most mistakes.",
      planTitle: "Review plan",
      planDesc: "See upcoming review dates for your words.",
      knownTitle: "Known words",
      knownDesc: "Import words you already know.",
      customTitle: "My words",
      customDesc: "Your personal words to learn.",
      reportTitle: "Report an issue",
      reportDesc: "Tell us about a wrong word or translation.",
      helpTitle: "Help & tour",
      helpDesc: "Instructions and a quick tour."
    },
    tour: {
      title: "Quick tour",
      stepLabel: "Step",
      back: "Back",
      next: "Next",
      done: "To community",
      skip: "End tour",
      steps: [
        {
          key: "stats",
          title: "Stats",
          desc: "Your progress and daily numbers.",
          mobileDesc:
            "See your overall progress: words known, days learning, and daily targets."
        },
        {
          key: "today",
          title: "Today",
          desc: "Start today's learning or review.",
          mobileDesc:
            "Use these buttons to start learning and review sessions. Numbers show today's plan."
        },
        {
          key: "sections",
          title: "Sections",
          desc: "Weak words, custom words, and reports.",
          mobileDesc:
            "Quick access to weak words, your custom list, and issue reports. Help is here too."
        },
        {
          key: "chart",
          title: "Discipline chart",
          desc: "See progress over time.",
          mobileDesc:
            "Track how your vocabulary grows day by day to see your consistency."
        }
      ]
    }
}
};

async function getJson(path, token) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, { headers });
  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      throw new Error(data.detail || "Request failed");
    }
    const message = await response.text();
    throw new Error(message || "Request failed");
  }
  return response.json();
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [chartRange, setChartRange] = useState("14d");
  const [theme, setTheme] = useState(() => getCookie("theme") || "light");
  const { lang, setLang } = useUiLang();
  const interfaceLang = lang || "ru";
  const t = TEXT[interfaceLang] || TEXT.ru;
  const locale = interfaceLang === "en" ? "en-US" : "ru-RU";
  const wordsLabel = interfaceLang === "en" ? "words" : "Ã‘ÂÃÂ»ÃÂ¾ÃÂ²";
  const goLearn = () => {
    window.location.href = "/learn";
  };

  const goReview = () => {
    window.location.href = "/review";
  };

  const goReading = () => {
    window.location.href = "/reading";
  };

  const continueToCommunity = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("tour_active", "1");
      window.localStorage.setItem("tour_step", "0");
      window.localStorage.setItem("tour_stage", "community");
    }
    window.location.href = "/community";
    return "continue";
  };


  const sections = [
    {
      href: "/review-plan",
      title: t.sections.planTitle,
      desc: t.sections.planDesc
    },
    {
      href: "/stats",
      title: t.sections.weakTitle,
      desc: t.sections.weakDesc
    },
    {
      href: "/custom-words",
      title: t.sections.customTitle,
      desc: t.sections.customDesc
    },
    {
      href: "/known-words",
      title: t.sections.knownTitle,
      desc: t.sections.knownDesc
    },
    {
      href: "/reports",
      title: t.sections.reportTitle,
      desc: t.sections.reportDesc
    },
    {
      href: "/welcome",
      title: t.sections.helpTitle,
      desc: t.sections.helpDesc
    }
  ];
  const tourSteps = t.tour ? t.tour.steps || [] : [];
  const tourLabels = t.tour || {};

  useEffect(() => {
    let active = true;
    const token = getCookie("token");
    if (!token) {
      window.location.href = "/auth";
      return;
    }
    setLoading(true);
    getJson(`/dashboard?range=${chartRange}`, token)
      .then((data) => {
        if (!active) {
          return;
        }
        setDashboard(data);
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        const message = err.message || "ÃÂÃÂµ Ã‘Æ’ÃÂ´ÃÂ°ÃÂ»ÃÂ¾Ã‘ÂÃ‘Å’ ÃÂ·ÃÂ°ÃÂ³Ã‘â‚¬Ã‘Æ’ÃÂ·ÃÂ¸Ã‘â€šÃ‘Å’ Ã‘ÂÃ‘â€šÃÂ°Ã‘â€šÃÂ¸Ã‘ÂÃ‘â€šÃÂ¸ÃÂºÃ‘Æ’";
        if (message === "Onboarding required") {
          window.location.href = "/onboarding";
          return;
        }
        if (message.includes("token") || message.includes("User not found")) {
          window.location.href = "/auth";
          return;
        }
        setError(message);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [chartRange]);

  useEffect(() => {
    if (!dashboard) {
      return;
    }
    const nextLang = dashboard.interface_lang || interfaceLang || "ru";
    setLang(nextLang);
    const nextTheme = dashboard.theme || theme || "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("theme", nextTheme);
    setCookie("theme", nextTheme);
  }, [dashboard]);

  const formatShortDate = (value) => {
    if (!value) {
      return "";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString(locale, { day: "2-digit", month: "short" });
  };

  const chart = useMemo(() => {
    if (!dashboard) {
      return null;
    }
    const series = dashboard.learned_series || [];
    if (!series.length) {
      return {
        points: [],
        width: 720,
        height: 260,
        padding: { top: 18, right: 20, bottom: 32, left: 48 },
        minValue: 0,
        maxValue: 0,
        range: 1,
        plotHeight: 0
      };
    }

    const totalLearned = series.reduce((sum, item) => sum + (item.count || 0), 0);
    const base = Math.max(0, (dashboard.known_words || 0) - totalLearned);

    let cumulative = base;
    const rawPoints = series.map((item) => {
      cumulative += item.count || 0;
      return {
        date: item.date,
        value: cumulative
      };
    });

    const values = rawPoints.map((point) => point.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = Math.max(1, maxValue - minValue);

    const width = 720;
    const height = 260;
    const padding = { top: 18, right: 20, bottom: 32, left: 48 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const points = rawPoints.map((point, idx) => {
      const x =
        padding.left +
        (rawPoints.length <= 1 ? plotWidth / 2 : (idx / (rawPoints.length - 1)) * plotWidth);
      const y = padding.top + (1 - (point.value - minValue) / range) * plotHeight;
      return { ...point, x, y };
    });

    const line = points
      .map((point, idx) => `${idx === 0 ? "M" : "L"}${point.x} ${point.y}`)
      .join(" ");
    const baseY = padding.top + plotHeight;
    const area = `${line} L ${points[points.length - 1].x} ${baseY} L ${points[0].x} ${baseY} Z`;

    return {
      width,
      height,
      padding,
      points,
      line,
      area,
      minValue,
      maxValue,
      range,
      plotHeight
    };
  }, [dashboard]);

  const chartSummary =
    chart && chart.points.length
      ? {
          start: chart.points[0].value,
          end: chart.points[chart.points.length - 1].value,
          days: chart.points.length
        }
      : null;
  const chartDelta = chartSummary ? chartSummary.end - chartSummary.start : 0;
  const rangeOptions = [
    { key: "7d", label: t.chartRanges.week },
    { key: "14d", label: t.chartRanges.twoWeeks },
    { key: "30d", label: t.chartRanges.month },
    { key: "all", label: t.chartRanges.all }
  ];
  const tips = t.tips?.items || [];

  const chartTicks = chart
    ? Array.from(
        new Set([
          chart.minValue,
          Math.round((chart.minValue + chart.maxValue) / 2),
          chart.maxValue
        ])
      )
        .map((value) => ({
          value,
          y:
            chart.padding.top +
            (1 - (value - chart.minValue) / chart.range) * chart.plotHeight
        }))
        .sort((a, b) => b.value - a.value)
    : [];

  const startLabel =
    chart && chart.points.length ? formatShortDate(chart.points[0].date) : "";
  const endLabel =
    chart && chart.points.length
      ? formatShortDate(chart.points[chart.points.length - 1].date)
      : "";

  return (
    <main>
      {loading ? <p className="muted">{t.loading}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {dashboard ? (
        <>
          <div className="page-hero">
            <div className="page-hero-main">
              <div className="page-kicker">{t.today}</div>
              <h1 className="page-title">{t.title}</h1>
              <p className="page-tagline">{t.tagline}</p>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="stats-grid stats-grid-home" data-tour="stats">
              <div className="stat-card stat-card-home stat-card-known">
                <div className="stat-label">{t.stats.known}</div>
                <div className="stat-value">{dashboard.known_words}</div>
              </div>
              <div className="stat-card stat-card-home stat-card-days">
                <div className="stat-label">{t.stats.days}</div>
                <div className="stat-value">{dashboard.days_learning}</div>
              </div>
              <div className="stat-card stat-card-home stat-card-learn">
                <div className="stat-label">{t.stats.availableLearn}</div>
                <div className="stat-value">{dashboard.learn_available}</div>
              </div>
              <div className="stat-card stat-card-home stat-card-review">
                <div className="stat-label">{t.stats.availableReview}</div>
                <div className="stat-value">{dashboard.review_available}</div>
              </div>
            </div>

            <div className="panel" data-tour="today">
              <div className="panel-title">{t.today}</div>
              <div className="today-actions">
                <button type="button" className="today-action" onClick={goLearn}>
                  <span className="today-action-label">{t.stats.learnToday}</span>
                  <span className="today-action-count">
                    {dashboard.learn_today} {wordsLabel}
                  </span>
                </button>
                <button type="button" className="today-action" onClick={goReview}>
                  <span className="today-action-label">{t.stats.reviewToday}</span>
                  <span className="today-action-count">
                    {dashboard.review_today} {wordsLabel}
                  </span>
                </button>
                <button type="button" className="today-action" onClick={goReading}>
                  <span className="today-action-label">{t.stats.readingToday}</span>
                  <span className="today-action-count">10 {wordsLabel}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="section-grid">
            <div className="panel">
              <div className="panel-title">{t.tips.title}</div>
              <p className="muted">{t.tips.intro}</p>
              <div className="feature-grid">
                {tips.map((item) => (
                  <div key={item.title} className="feature-card">
                    <div className="feature-title">{item.title}</div>
                    <p className="feature-desc">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel" data-tour="sections">
              <div className="panel-title">{t.sections.title}</div>
              <div className="card-list card-grid-2">
                {sections.map((item) => (
                  <a key={item.href} className="card card-link" href={item.href}>
                    <div className="card-title">{item.title}</div>
                    <div className="card-sub">{item.desc}</div>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="panel" data-tour="chart">
            <div className="panel-title">{t.chartTitle}</div>
            <p className="muted">{t.chartDesc}</p>
            <div className="chart-controls">
              <div className="segmented">
                {rangeOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={chartRange === option.key ? "is-active" : ""}
                    onClick={() => setChartRange(option.key)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            {chart && chart.points.length ? (
              <div className="chart">
                <svg
                  className="chart-svg"
                  viewBox={`0 0 ${chart.width} ${chart.height}`}
                  role="img"
                  aria-label={t.chartAria}
                >
                  <defs>
                    <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgba(59, 130, 246, 0.45)" />
                      <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
                    </linearGradient>
                  </defs>
                  <g className="chart-grid">
                    {chartTicks.map((tick) => (
                      <line
                        key={`grid-${tick.value}`}
                        x1={chart.padding.left}
                        x2={chart.width - chart.padding.right}
                        y1={tick.y}
                        y2={tick.y}
                      />
                    ))}
                  </g>
                  <path d={chart.area} className="chart-area" />
                  <path d={chart.line} className="chart-line" />
                  {chart.points.map((point) => (
                    <circle
                      key={point.date}
                      cx={point.x}
                      cy={point.y}
                      r={3.5}
                      className="chart-dot"
                    />
                  ))}
                  {chartTicks.map((tick) => (
                    <text
                      key={`label-${tick.value}`}
                      x={8}
                      y={tick.y + 4}
                      className="chart-axis-label"
                    >
                      {tick.value}
                    </text>
                  ))}
                </svg>
                <div className="chart-axis">
                  <span>{startLabel}</span>
                  <span>{endLabel}</span>
                </div>
                {chartSummary ? (
                  <div className="chart-summary">
                    <span>
                      {t.chartStart}: <strong>{chartSummary.start}</strong>
                    </span>
                    <span>
                      {t.chartNow}: <strong>{chartSummary.end}</strong>
                    </span>
                    <span>
                      +{chartDelta} {t.chartDelta} {chartSummary.days}{" "}
                      {interfaceLang === "en" ? "days" : "ÃÂ´ÃÂ½ÃÂµÃÂ¹"}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="muted">{t.chartNoData}</p>
            )}
          </div>
          <TourOverlay steps={tourSteps} labels={tourLabels} stage="home" onFinish={continueToCommunity} />
        </>
      ) : null}
    </main>
  );
}
