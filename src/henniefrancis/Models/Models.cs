namespace HennieFrancis.Blog;

public static class Models
{
    public static string FixName(this string input)
    {
        string results = "";

        if (input == "poe")
        {
            input = "PoE";
        }
        else if (input == "cv")
        {
            input = "CV";
        }
        else if (input == "careerhistory")
        {
            input = "Career History";
        }
        else if (input == "poe/projects")
        {
            input = "Projects";
        }
        else if (input == "specialawards")
        {
            input = "Special Awards";
        }

        results = string.Concat(input[0].ToString().ToUpper(), input.AsSpan(1));
        
        return results;
    }
    

    public static string CleanName(string input, string src)
    {
        string results = "";

        
        if (input.Contains('/'))
        {
            int index = input.IndexOf('/');
            if (index >= 0)
                results = input[..index];
        }
        else
        {
            results = input;
        }

        if (results == "poe")
        {
            if (src == "brdc")
            {
                results = "portfolio-of-evidence";
            }
            else
            {
                results = "PoE";
            }
        }
        else if (input == "careerhistory")
        {
            if (src == "brdc")
            {
                results = "career-history";
            }
            else
            {
                results = "Career History";
            }
        }
        else if (input == "specialawards")
        {
            if (src == "brdc")
            {
                results = "special-awards";
            }
            else
            {
                results = "Special Awards";
            }
        }

        return FixName(results);
    }

    public static string SubNames(string input)
    {
        string results = "";

        if (input == "poe")
        {
            input = "portfolio-of-evidance";
        }

        if (input.Contains('/'))
        {
            int index = input.IndexOf('/');

            int indexCount = input.ToCharArray().Count(c => c == '/');

            if (index >= 0)
            {
                string tmpResults = input[index..];

                if (indexCount == 1)
                {
                    results += tmpResults.Replace("/", "");
                }
                else
                {
                    string[] elements = tmpResults.Split('/');

                    foreach (var element in elements)
                    {
                        if (!string.IsNullOrEmpty(element))
                        {
                            results += $"{element} > ";
                        }
                    }

                    if (results.Substring(results.Length-3, 3) == " > ")
                    {
                        results = results.Substring(0, results.Length - 3);
                    }
                    
                }
            }
        }

        return results.ToLower();
    }
}
