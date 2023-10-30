namespace blog
{
    public static class Models
    {
        public static string FixName(this string input) =>
        input switch
        {
            null => throw new ArgumentNullException(nameof(input)),
            "" => throw new ArgumentException($"{nameof(input)} cannot be empty", nameof(input)),
            _ => string.Concat(input[0].ToString().ToUpper(), input.AsSpan(1))
        };

        public static string CleanName(string input)
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

            return FixName(results);
        }

        public static string SubNames(string input)
        {
            string results = "";

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
}
