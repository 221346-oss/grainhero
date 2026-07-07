"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useLanguage } from "@/app/[locale]/providers"
import { useAuth } from "@/app/[locale]/providers"
import { Languages, Check } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"

export function LanguageSelector() {
  const { currentLanguage, availableLanguages } = useLanguage()
  const { updateLanguage } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  type LanguageCode = typeof availableLanguages[number]["code"];

  const handleLanguageChange = (languageCode: string) => {
    const validLocales = availableLanguages.map(l => l.code)
    if (validLocales.includes(languageCode as LanguageCode)) {
      updateLanguage(languageCode as LanguageCode)
    }
    const segments = pathname.split("/")
    let newPath = ""
    if (validLocales.includes(segments[1] as LanguageCode)) {
      segments[1] = languageCode
      newPath = segments.join("/")
    } else {
      newPath = `/${languageCode}${pathname}`
    }
    // Use replace instead of push for instant switching without history entry
    router.replace(newPath)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
          <Languages className="h-4 w-4 mr-2" />
          {availableLanguages.find((lang) => lang.code === currentLanguage)?.name}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {availableLanguages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className="flex items-center justify-between"
          >
            <span>{language.name}</span>
            {currentLanguage === language.code && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
