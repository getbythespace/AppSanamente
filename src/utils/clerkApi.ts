export async function createClerkUser({ email, password, firstName, lastName }: {
  email: string
  password: string
  firstName: string
  lastName: string
}) {
  const res = await fetch('https://api.clerk.com/v1/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY!}`
    },
    body: JSON.stringify({
      email_address: [email],
      password,
      first_name: firstName,
      last_name: lastName
    })
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.errors?.[0]?.message || 'Error creando usuario en Clerk')
  }
  return res.json()
}



//borrar archivo