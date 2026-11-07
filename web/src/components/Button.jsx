const variantClasses = {
	primary: 'bg-brand text-white hover:bg-brand-dark',
	secondary: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
	danger: 'bg-red-600 text-white hover:bg-red-700',
};

function Button({
	children,
	variant = 'primary',
	type = 'button',
	disabled = false,
	loading = false,
	onClick,
}) {
	const isDisabled = disabled || loading;

	return (
		<button
			type={type}
			disabled={isDisabled}
			onClick={onClick}
			className={`w-full rounded-xl py-3 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]}`}
		>
			{loading ? 'Cargando…' : children}
		</button>
	);
}

export default Button;
